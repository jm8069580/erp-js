import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { FelService } from '../fel/fel.service';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: any;
  let fel: any;

  const customer = { id: 'cust-1', name: 'Juan Perez', isActive: true };
  const config = { id: 1, salesAccountId: 'sales-acc', itbmsAccountId: 'itbms-acc', receivableAccountId: 'recv-acc' };
  const accountSales = { id: 'sales-acc', type: 'INGRESO', isActive: true };
  const accountItbms = { id: 'itbms-acc', type: 'PASIVO', isActive: true };
  const accountRecv = { id: 'recv-acc', type: 'ACTIVO', isActive: true };

  const draftInvoice = {
    id: 'inv-1',
    number: 1,
    serie: 'A',
    folio: 1,
    date: new Date('2026-09-15'),
    customerId: 'cust-1',
    customerName: 'Juan Perez',
    saleId: null,
    subtotal: 100,
    itbms: 7,
    total: 107,
    status: 'DRAFT',
    felStatus: 'NONE',
    createdById: 'user-1',
  };

  const completedInvoice = { ...draftInvoice, status: 'COMPLETED' };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      invoice: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      journalEntry: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      accountingConfig: { findUnique: jest.fn() },
      account: { findUnique: jest.fn() },
      customer: { findUnique: jest.fn() },
      sale: { findUnique: jest.fn() },
    };

    fel = {
      enabled: false,
      enviar: jest.fn(),
      anular: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: FelService, useValue: fel },
      ],
    }).compile();

    service = moduleRef.get(InvoicesService);
  });

  describe('create', () => {
    it('creates a draft invoice with customerName', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.customer.findUnique.mockResolvedValue(customer);
      prisma.invoice.findFirst.mockResolvedValue(null);
      prisma.invoice.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...draftInvoice, ...data, id: 'inv-new', items: data.items?.create ?? [] }),
      );

      const result = await service.create(
        {
          customerName: 'Juan Perez',
          items: [{ description: 'Laptop', quantity: 1, unitPrice: 100 }],
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(prisma.invoice.create).toHaveBeenCalled();
    });

    it('resolves customer name when customerId provided', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.customer.findUnique.mockResolvedValue(customer);
      prisma.invoice.findFirst.mockResolvedValue(null);
      prisma.invoice.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...draftInvoice, ...data, id: 'inv-new' }),
      );

      await service.create(
        {
          customerId: 'cust-1',
          items: [{ description: 'Laptop', quantity: 1, unitPrice: 100 }],
        },
        'user-1',
      );

      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
      });
    });

    it('rejects when neither customerId nor customerName', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { items: [{ description: 'X', quantity: 1, unitPrice: 10 }] },
          'user-1',
        ),
      ).rejects.toThrow('customerId or customerName');
    });

    it('rejects inactive customer', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.customer.findUnique.mockResolvedValue({ ...customer, isActive: false });

      await expect(
        service.create(
          { customerId: 'cust-1', items: [{ description: 'X', quantity: 1, unitPrice: 10 }] },
          'user-1',
        ),
      ).rejects.toThrow('inactive');
    });

    it('rejects missing sale', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.customer.findUnique.mockResolvedValue(customer);
      prisma.sale.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            customerId: 'cust-1',
            saleId: 'bad-sale',
            items: [{ description: 'X', quantity: 1, unitPrice: 10 }],
          },
          'user-1',
        ),
      ).rejects.toThrow('not found');
    });
  });

  describe('findAll / findOne', () => {
    it('returns invoices', async () => {
      prisma.invoice.findMany.mockResolvedValue([draftInvoice]);
      const result = await service.findAll({});
      expect(result).toEqual([draftInvoice]);
    });

    it('throws when invoice not found', async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('complete', () => {
    it('completes a draft invoice and creates journal entry', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.invoice.findUnique.mockResolvedValue(draftInvoice);
      prisma.journalEntry.findUnique.mockResolvedValue(null);
      prisma.accountingConfig.findUnique.mockResolvedValue(config);
      prisma.account.findUnique
        .mockResolvedValueOnce(accountRecv)
        .mockResolvedValueOnce(accountSales)
        .mockResolvedValueOnce(accountItbms);
      prisma.journalEntry.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue(completedInvoice);

      const result = await service.complete('inv-1', 'user-1');

      expect(result.status).toBe('COMPLETED');
      expect(prisma.journalEntry.create).toHaveBeenCalled();
    });

    it('rejects completing a non-draft invoice', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.invoice.findUnique.mockResolvedValue(completedInvoice);

      await expect(service.complete('inv-1', 'user-1')).rejects.toThrow('Only draft');
    });

    it('rejects when invoice already posted', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.invoice.findUnique.mockResolvedValue(draftInvoice);
      prisma.journalEntry.findUnique.mockResolvedValue({ id: 'je-1' });

      await expect(service.complete('inv-1', 'user-1')).rejects.toThrow('already has an accounting entry');
    });

    it('rejects when accounting config missing', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.invoice.findUnique.mockResolvedValue(draftInvoice);
      prisma.journalEntry.findUnique.mockResolvedValue(null);
      prisma.accountingConfig.findUnique.mockResolvedValue(null);

      await expect(service.complete('inv-1', 'user-1')).rejects.toThrow('not set');
    });

    it('rejects when sales default account inactive', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.invoice.findUnique.mockResolvedValue(draftInvoice);
      prisma.journalEntry.findUnique.mockResolvedValue(null);
      prisma.accountingConfig.findUnique.mockResolvedValue(config);
      prisma.account.findUnique
        .mockResolvedValueOnce({ ...accountRecv, isActive: true })
        .mockResolvedValueOnce({ ...accountSales, isActive: false })
        .mockResolvedValueOnce({ ...accountItbms, isActive: true });

      await expect(service.complete('inv-1', 'user-1')).rejects.toThrow('not found or is inactive');
    });

    it('rejects completing a non-existent invoice', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.invoice.findUnique.mockResolvedValue(null);

      await expect(service.complete('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('sends the invoice to FEL when enabled and authorized', async () => {
      fel.enabled = true;
      fel.enviar.mockResolvedValue({ accepted: true, cufe: 'cufe-1' });
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.invoice.findUnique.mockResolvedValue(draftInvoice);
      prisma.journalEntry.findUnique.mockResolvedValue(null);
      prisma.accountingConfig.findUnique.mockResolvedValue(config);
      prisma.account.findUnique
        .mockResolvedValueOnce(accountRecv)
        .mockResolvedValueOnce(accountSales)
        .mockResolvedValueOnce(accountItbms);
      prisma.journalEntry.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue(completedInvoice);

      await service.complete('inv-1', 'user-1');

      expect(fel.enviar).toHaveBeenCalledWith('inv-1');
    });

    it('marks invoice as PENDING_FEL when FEL submit fails', async () => {
      fel.enabled = true;
      fel.enviar.mockRejectedValue(new Error('timeout'));
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.invoice.findUnique.mockResolvedValue(draftInvoice);
      prisma.journalEntry.findUnique.mockResolvedValue(null);
      prisma.accountingConfig.findUnique.mockResolvedValue(config);
      prisma.account.findUnique
        .mockResolvedValueOnce(accountRecv)
        .mockResolvedValueOnce(accountSales)
        .mockResolvedValueOnce(accountItbms);
      prisma.journalEntry.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue(completedInvoice);

      await service.complete('inv-1', 'user-1');

      expect(prisma.invoice.update).toHaveBeenLastCalledWith({
        where: { id: 'inv-1' },
        data: {
          felStatus: 'PENDING_FEL',
          felMessage: expect.stringContaining('timeout'),
        },
      });
    });
  });

  describe('annul', () => {
    it('annuls a completed invoice with reversal entry', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.invoice.findUnique.mockResolvedValue(completedInvoice);
      prisma.journalEntry.findUnique.mockResolvedValue(null);
      prisma.accountingConfig.findUnique.mockResolvedValue(config);
      prisma.account.findUnique
        .mockResolvedValueOnce(accountRecv)
        .mockResolvedValueOnce(accountSales)
        .mockResolvedValueOnce(accountItbms);
      prisma.journalEntry.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue({ ...completedInvoice, status: 'ANNULLED' });

      const result = await service.annul('inv-1', 'user-1');

      expect(result.status).toBe('ANNULLED');
      expect(prisma.journalEntry.create).toHaveBeenCalled();
    });

    it('rejects annulling a non-completed invoice', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.invoice.findUnique.mockResolvedValue(draftInvoice);

      await expect(service.annul('inv-1', 'user-1')).rejects.toThrow('Only completed');
    });

    it('rejects double annul', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.invoice.findUnique.mockResolvedValue(completedInvoice);
      prisma.journalEntry.findUnique.mockResolvedValue({ id: 'rev-1' });

      await expect(service.annul('inv-1', 'user-1')).rejects.toThrow('already has a reversal');
    });

    it('rejects annul when config missing', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.invoice.findUnique.mockResolvedValue(completedInvoice);
      prisma.journalEntry.findUnique.mockResolvedValue(null);
      prisma.accountingConfig.findUnique.mockResolvedValue(null);

      await expect(service.annul('inv-1', 'user-1')).rejects.toThrow('not set');
    });

    it('rejects annul when invoice not found', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.invoice.findUnique.mockResolvedValue(null);

      await expect(service.annul('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('sends the annullment to FEL when enabled and invoice was FEL-sent', async () => {
      fel.enabled = true;
      fel.anular.mockResolvedValue({ accepted: true });
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.invoice.findUnique.mockResolvedValue({
        ...completedInvoice,
        felStatus: 'AUTHORIZED',
      });
      prisma.journalEntry.findUnique.mockResolvedValue(null);
      prisma.accountingConfig.findUnique.mockResolvedValue(config);
      prisma.account.findUnique
        .mockResolvedValueOnce(accountRecv)
        .mockResolvedValueOnce(accountSales)
        .mockResolvedValueOnce(accountItbms);
      prisma.journalEntry.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue({
        ...completedInvoice,
        felStatus: 'AUTHORIZED',
        status: 'ANNULLED',
      });

      await service.annul('inv-1', 'user-1');

      expect(fel.anular).toHaveBeenCalledWith('inv-1', 'Anulación de factura');
    });

    it('keeps accounting annul working even if FEL annul fails', async () => {
      fel.enabled = true;
      fel.anular.mockRejectedValue(new Error('pac down'));
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.invoice.findUnique.mockResolvedValue({
        ...completedInvoice,
        felStatus: 'AUTHORIZED',
      });
      prisma.journalEntry.findUnique.mockResolvedValue(null);
      prisma.accountingConfig.findUnique.mockResolvedValue(config);
      prisma.account.findUnique
        .mockResolvedValueOnce(accountRecv)
        .mockResolvedValueOnce(accountSales)
        .mockResolvedValueOnce(accountItbms);
      prisma.journalEntry.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue({
        ...completedInvoice,
        felStatus: 'AUTHORIZED',
        status: 'ANNULLED',
      });

      const result = await service.annul('inv-1', 'user-1');

      expect(result.status).toBe('ANNULLED');
      expect(prisma.invoice.update).toHaveBeenLastCalledWith({
        where: { id: 'inv-1' },
        data: {
          felStatus: 'PENDING_FEL',
          felMessage: expect.stringContaining('pac down'),
        },
      });
    });
  });
});