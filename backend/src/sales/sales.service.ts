import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryMovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

const SALE_INCLUDE = {
  items: {
    include: {
      product: true,
    },
  },
  customer: true,
  createdBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.SaleInclude;

type SaleClient = Prisma.TransactionClient;

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(createSaleDto: CreateSaleDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      let total = 0;
      let customerName = createSaleDto.customerName;
      const items: Prisma.SaleItemCreateWithoutSaleInput[] = [];
      const exits: {
        productId: string;
        quantity: number;
        stockAfter: number;
      }[] = [];

      if (createSaleDto.customerId) {
        const customer = await this.findCustomerTx(tx, createSaleDto.customerId);
        customerName = customer.name;
      }

      for (const item of createSaleDto.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || !product.isActive) {
          throw new BadRequestException(
            `Product ${item.productId} not found or is inactive`,
          );
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Not enough stock for product ${product.sku} (available: ${product.stock})`,
          );
        }

        const subtotal = product.price * item.quantity;
        total += subtotal;
        items.push({
          product: { connect: { id: product.id } },
          quantity: item.quantity,
          unitPrice: product.price,
          subtotal,
        });

        const updated = await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.quantity } },
        });
        exits.push({
          productId: product.id,
          quantity: item.quantity,
          stockAfter: updated.stock,
        });
      }

      const data: Prisma.SaleUncheckedCreateInput = {
        customerName,
        status: createSaleDto.status,
        total,
        createdById: userId,
        items: { create: items },
      };

      if (createSaleDto.customerId) {
        data.customerId = createSaleDto.customerId;
      }

      const sale = await tx.sale.create({
        data,
        include: SALE_INCLUDE,
      });

      const label = `Venta SALE-${String(sale.number).padStart(4, '0')}`;
      for (const exit of exits) {
        await tx.inventoryMovement.create({
          data: {
            productId: exit.productId,
            type: InventoryMovementType.EXIT,
            quantity: exit.quantity,
            stockAfter: exit.stockAfter,
            reason: label,
            saleId: sale.id,
            createdById: userId,
          },
        });
      }

      return sale;
    });
  }

  async findAll() {
    return this.prisma.sale.findMany({
      include: SALE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: SALE_INCLUDE,
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }
    return sale;
  }

  async update(id: string, updateSaleDto: UpdateSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await this.findSaleTx(tx, id);

      await this.applyStatusChange(tx, sale, updateSaleDto.status);

      const data: Prisma.SaleUpdateInput = {
        customerName: updateSaleDto.customerName ?? sale.customerName,
        status: updateSaleDto.status ?? sale.status,
      };

      if (updateSaleDto.customerId !== undefined) {
        const customer = await this.findCustomerTx(tx, updateSaleDto.customerId);
        data.customer = { connect: { id: customer.id } };
        data.customerName = customer.name;
      }

      return tx.sale.update({
        where: { id },
        data,
        include: SALE_INCLUDE,
      });
    });
  }

  async remove(id: string) {
    await this.prisma.$transaction(async (tx) => {
      const sale = await this.findSaleTx(tx, id);

      if (sale.status !== 'CANCELLED') {
        await this.restoreStock(tx, sale.items);
      }

      await tx.sale.delete({ where: { id } });
    });

    return { success: true };
  }

  private async findSaleTx(tx: SaleClient, id: string) {
    const sale = await tx.sale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }
    return sale;
  }

  private async findCustomerTx(tx: SaleClient, id: string) {
    const customer = await tx.customer.findUnique({ where: { id } });
    if (!customer || !customer.isActive) {
      throw new BadRequestException(`Customer ${id} not found or is inactive`);
    }
    return customer;
  }

  private async applyStatusChange(
    tx: SaleClient,
    sale: { id: string; status: string; items: { productId: string; quantity: number }[] },
    newStatus?: string,
  ) {
    if (!newStatus || newStatus === sale.status) return;

    if (newStatus === 'CANCELLED' && sale.status !== 'CANCELLED') {
      await this.restoreStock(tx, sale.items);
      return;
    }

    if (newStatus === 'COMPLETED' && sale.status === 'CANCELLED') {
      for (const item of sale.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product || product.stock < item.quantity) {
          throw new BadRequestException(
            `Cannot restore sale: not enough stock for product ${
              product?.sku ?? item.productId
            }`,
          );
        }
      }
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }
  }

  private async restoreStock(
    tx: SaleClient,
    items: { productId: string; quantity: number }[],
  ) {
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
  }
}