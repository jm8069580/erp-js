import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JournalEntryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices.query';
import { round2 } from '../accounting/money.util';

const DEFAULT_ITBMS_RATE = 0.07;

const INVOICE_INCLUDE = {
  customer: true,
  items: {
    orderBy: { id: 'asc' as const },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
  journalEntry: {
    select: { id: true, number: true, status: true },
  },
  reversalEntry: {
    select: { id: true, number: true, status: true },
  },
  sale: {
    select: { id: true, number: true, total: true },
  },
} satisfies Prisma.InvoiceInclude;

type InvoiceClient = Prisma.TransactionClient;

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInvoiceDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const customerName = await this.resolveCustomerName(
        tx,
        dto.customerId,
        dto.customerName,
      );

      if (dto.saleId) {
        await this.validateSaleExists(tx, dto.saleId);
      }

      const folio = await this.nextFolio(tx, dto.serie ?? 'A');

      let subtotal = 0;
      let itbms = 0;
      const items: Prisma.InvoiceItemUncheckedCreateWithoutInvoiceInput[] = [];

      for (const item of dto.items) {
        const rate = item.itbmsRate ?? DEFAULT_ITBMS_RATE;
        const itemSubtotal = round2(item.unitPrice * item.quantity);
        const itemItbms = round2(itemSubtotal * rate);
        subtotal += itemSubtotal;
        itbms += itemItbms;
        items.push({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          itbmsRate: rate,
          subtotal: itemSubtotal,
        });
      }

      return tx.invoice.create({
        data: {
          serie: dto.serie ?? 'A',
          folio,
          date: dto.date ? new Date(dto.date) : new Date(),
          customerId: dto.customerId,
          customerName,
          saleId: dto.saleId,
          subtotal: round2(subtotal),
          itbms: round2(itbms),
          total: round2(subtotal + itbms),
          createdById: userId,
          items: { create: items },
        },
        include: INVOICE_INCLUDE,
      });
    });
  }

  async findAll(query: ListInvoicesQueryDto) {
    const where: Prisma.InvoiceWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.serie) where.serie = query.serie;
    const date: Prisma.InvoiceWhereInput['date'] = {};
    if (query.dateFrom) date.gte = new Date(query.dateFrom);
    if (query.dateTo) date.lte = new Date(query.dateTo);
    if (Object.keys(date).length > 0) where.date = date;

    return this.prisma.invoice.findMany({
      where,
      include: INVOICE_INCLUDE,
      orderBy: [{ folio: 'desc' }],
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: INVOICE_INCLUDE,
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }
    return invoice;
  }

  async complete(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await this.findInvoiceTx(tx, id);
      if (invoice.status !== 'DRAFT') {
        throw new BadRequestException(
          `Only draft invoices can be completed (current: ${invoice.status})`,
        );
      }

      const existingEntry = await tx.journalEntry.findUnique({
        where: { invoiceId: id },
      });
      if (existingEntry) {
        throw new BadRequestException('Invoice already has an accounting entry');
      }

      const config = await tx.accountingConfig.findUnique({ where: { id: 1 } });
      if (!config) {
        throw new BadRequestException(
          'Accounting config is not set; please run the seed or configure defaults',
        );
      }
      const accounts = await this.resolveConfigAccounts(tx, config);

      const label = this.label(invoice);

      await tx.journalEntry.create({
        data: {
          date: invoice.date,
          concept: `Venta ${label}`,
          reference: label,
          status: JournalEntryStatus.BOOKED,
          invoiceId: invoice.id,
          createdById: userId,
          lines: {
            create: [
              {
                accountId: accounts.receivable,
                debit: invoice.total,
                credit: 0,
                description: label,
              },
              {
                accountId: accounts.sales,
                debit: 0,
                credit: invoice.subtotal,
                description: label,
              },
              {
                accountId: accounts.itbms,
                debit: 0,
                credit: invoice.itbms,
                description: label,
              },
            ],
          },
        },
      });

      return tx.invoice.update({
        where: { id },
        data: { status: 'COMPLETED' },
        include: INVOICE_INCLUDE,
      });
    });
  }

  async annul(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await this.findInvoiceTx(tx, id);
      if (invoice.status !== 'COMPLETED') {
        throw new BadRequestException(
          `Only completed invoices can be annulled (current: ${invoice.status})`,
        );
      }

      const reversalEntry = await tx.journalEntry.findUnique({
        where: { reversalOfId: id },
      });
      if (reversalEntry) {
        throw new BadRequestException('Invoice already has a reversal entry');
      }

      const config = await tx.accountingConfig.findUnique({ where: { id: 1 } });
      if (!config) {
        throw new BadRequestException(
          'Accounting config is not set; please run the seed or configure defaults',
        );
      }
      const accounts = await this.resolveConfigAccounts(tx, config);

      const label = this.label(invoice);

      await tx.journalEntry.create({
        data: {
          date: new Date(),
          concept: `Anulación ${label}`,
          reference: `Reversión ${label}`,
          status: JournalEntryStatus.BOOKED,
          reversalOfId: invoice.id,
          createdById: userId,
          lines: {
            create: [
              {
                accountId: accounts.receivable,
                debit: 0,
                credit: invoice.total,
                description: `Anulación ${label}`,
              },
              {
                accountId: accounts.sales,
                debit: invoice.subtotal,
                credit: 0,
                description: `Anulación ${label}`,
              },
              {
                accountId: accounts.itbms,
                debit: invoice.itbms,
                credit: 0,
                description: `Anulación ${label}`,
              },
            ],
          },
        },
      });

      return tx.invoice.update({
        where: { id },
        data: { status: 'ANNULLED' },
        include: INVOICE_INCLUDE,
      });
    });
  }

  private label(invoice: { serie: string; folio: number }) {
    return `FAC-${invoice.serie}${String(invoice.folio).padStart(4, '0')}`;
  }

  private async findInvoiceTx(tx: InvoiceClient, id: string) {
    const invoice = await tx.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }
    return invoice;
  }

  private async resolveCustomerName(
    tx: InvoiceClient,
    customerId?: string,
    customerName?: string,
  ) {
    if (customerId) {
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer || !customer.isActive) {
        throw new BadRequestException(
          `Customer ${customerId} not found or is inactive`,
        );
      }
      return customer.name;
    }
    if (customerName) {
      return customerName;
    }
    throw new BadRequestException(
      'Either customerId or customerName must be provided',
    );
  }

  private async validateSaleExists(tx: InvoiceClient, saleId: string) {
    const sale = await tx.sale.findUnique({ where: { id: saleId } });
    if (!sale) {
      throw new BadRequestException(`Sale with ID ${saleId} not found`);
    }
    return sale;
  }

  private async nextFolio(tx: InvoiceClient, serie: string) {
    const last = await tx.invoice.findFirst({
      where: { serie },
      orderBy: { folio: 'desc' },
      select: { folio: true },
    });
    return (last?.folio ?? 0) + 1;
  }

  private async resolveConfigAccounts(
    tx: InvoiceClient,
    config: {
      salesAccountId: string;
      itbmsAccountId: string;
      receivableAccountId: string;
    },
  ) {
    const [salesAccount, itbmsAccount, receivableAccount] = await Promise.all([
      tx.account.findUnique({ where: { id: config.salesAccountId } }),
      tx.account.findUnique({ where: { id: config.itbmsAccountId } }),
      tx.account.findUnique({ where: { id: config.receivableAccountId } }),
    ]);

    if (!salesAccount || !salesAccount.isActive) {
      throw new BadRequestException('Sales default account not found or is inactive');
    }
    if (!itbmsAccount || !itbmsAccount.isActive) {
      throw new BadRequestException('ITBMS default account not found or is inactive');
    }
    if (!receivableAccount || !receivableAccount.isActive) {
      throw new BadRequestException(
        'Receivable default account not found or is inactive',
      );
    }

    return {
      sales: salesAccount.id,
      itbms: itbmsAccount.id,
      receivable: receivableAccount.id,
    };
  }
}