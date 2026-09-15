import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { PrismaService } from '../prisma/prisma.service';

const product = {
  id: 'prod-1',
  name: 'Laptop',
  sku: 'LAP-001',
  price: 500,
  stock: 10,
  isActive: true,
};

describe('SalesService', () => {
  let service: SalesService;
  let prisma: any;

  const saleWithItems = {
    id: 'sale-1',
    status: 'COMPLETED',
    customerName: 'Cliente',
    items: [{ productId: 'prod-1', quantity: 2 }],
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
      inventoryMovement: {
        create: jest.fn(),
      },
      sale: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(prisma),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(SalesService);
  });

  describe('create', () => {
    it('creates a sale and decrements stock', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.product.update.mockResolvedValue({ ...product, stock: 8 });
      prisma.sale.create.mockResolvedValue({ id: 'sale-1', number: 4 });

      await service.create(
        {
          customerName: 'Juan',
          items: [{ productId: 'prod-1', quantity: 2 }],
        },
        'user-1',
      );

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { decrement: 2 } },
      });
      expect(prisma.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerName: 'Juan',
            total: 1000,
            createdById: 'user-1',
            items: {
              create: [
                {
                  product: { connect: { id: 'prod-1' } },
                  quantity: 2,
                  unitPrice: 500,
                  subtotal: 1000,
                },
              ],
            },
          }),
        }),
      );
      expect(prisma.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'prod-1',
            type: 'EXIT',
            quantity: 2,
            stockAfter: 8,
            reason: 'Venta SALE-0004',
            saleId: 'sale-1',
            createdById: 'user-1',
          }),
        }),
      );
    });

    it('rejects an unknown or inactive product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { items: [{ productId: 'prod-x', quantity: 1 }] },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.sale.create).not.toHaveBeenCalled();
      expect(prisma.inventoryMovement.create).not.toHaveBeenCalled();
    });

    it('links a customer by id and uses its name', async () => {
      prisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        name: 'Cliente Registrado',
        isActive: true,
      });
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.product.update.mockResolvedValue({ ...product, stock: 8 });
      prisma.sale.create.mockResolvedValue({ id: 'sale-1' });

      await service.create(
        {
          customerId: 'cust-1',
          items: [{ productId: 'prod-1', quantity: 2 }],
        },
        'user-1',
      );

      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
      });
      expect(prisma.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerName: 'Cliente Registrado',
            customerId: 'cust-1',
          }),
        }),
      );
    });

    it('rejects an unknown or inactive customer', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { customerId: 'cust-x', items: [{ productId: 'prod-1', quantity: 1 }] },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.product.findUnique).not.toHaveBeenCalled();
      expect(prisma.sale.create).not.toHaveBeenCalled();
    });

    it('rejects a sale without enough stock', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...product,
        stock: 1,
      });

      await expect(
        service.create(
          { items: [{ productId: 'prod-1', quantity: 5 }] },
          'user-1',
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Not enough stock for product LAP-001 (available: 1)',
        ),
      );
      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });

  describe('findAll / findOne', () => {
    it('returns all sales ordered by date desc', async () => {
      prisma.sale.findMany.mockResolvedValue([{ id: 'sale-1' }]);

      const result = await service.findAll();

      expect(result).toEqual([{ id: 'sale-1' }]);
      expect(prisma.sale.findMany).toHaveBeenCalledWith({
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('finds a sale by id', async () => {
      prisma.sale.findUnique.mockResolvedValue({ id: 'sale-1' });

      const result = await service.findOne('sale-1');

      expect(result).toEqual({ id: 'sale-1' });
    });

    it('throws when sale is not found', async () => {
      prisma.sale.findUnique.mockResolvedValue(null);

      await expect(service.findOne('sale-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates customerName and status without stock change', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        ...saleWithItems,
        status: 'COMPLETED',
      });
      prisma.sale.update.mockResolvedValue({ id: 'sale-1' });

      await service.update('sale-1', {
        customerName: 'Nuevo cliente',
        status: 'COMPLETED',
      });

      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(prisma.sale.update).toHaveBeenCalledWith({
        where: { id: 'sale-1' },
        data: { customerName: 'Nuevo cliente', status: 'COMPLETED' },
        include: expect.any(Object),
      });
    });

    it('restores stock when the sale is cancelled', async () => {
      prisma.sale.findUnique.mockResolvedValue({ ...saleWithItems });
      prisma.sale.update.mockResolvedValue({ id: 'sale-1' });

      await service.update('sale-1', { status: 'CANCELLED' });

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { increment: 2 } },
      });
      expect(prisma.customer.findUnique).not.toHaveBeenCalled();
    });

    it('(re)connects a customer by id and updates the name', async () => {
      prisma.sale.findUnique.mockResolvedValue({ ...saleWithItems });
      prisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        name: 'María González',
        isActive: true,
      });
      prisma.sale.update.mockResolvedValue({ id: 'sale-1' });

      await service.update('sale-1', { customerId: 'cust-1' });

      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
      });
      expect(prisma.sale.update).toHaveBeenCalledWith({
        where: { id: 'sale-1' },
        data: expect.objectContaining({
          customerName: 'María González',
          customer: { connect: { id: 'cust-1' } },
        }),
        include: expect.any(Object),
      });
    });

    it('rejects an unknown customer id on update', async () => {
      prisma.sale.findUnique.mockResolvedValue({ ...saleWithItems });
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.update('sale-1', { customerId: 'cust-x' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.sale.update).not.toHaveBeenCalled();
    });

    it('re-decrements stock when reactivating a cancelled sale', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        ...saleWithItems,
        status: 'CANCELLED',
      });
      prisma.product.findUnique.mockResolvedValue({ ...product, stock: 10 });
      prisma.sale.update.mockResolvedValue({ id: 'sale-1' });

      await service.update('sale-1', { status: 'COMPLETED' });

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { decrement: 2 } },
      });
    });

    it('fails to reactivate when there is not enough stock', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        ...saleWithItems,
        status: 'CANCELLED',
      });
      prisma.product.findUnique.mockResolvedValue({ ...product, stock: 1 });

      await expect(
        service.update('sale-1', { status: 'COMPLETED' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.sale.update).not.toHaveBeenCalled();
    });

    it('throws when sale is not found', async () => {
      prisma.sale.findUnique.mockResolvedValue(null);

      await expect(
        service.update('sale-1', { status: 'CANCELLED' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('restores stock and deletes a completed sale', async () => {
      prisma.sale.findUnique.mockResolvedValue({ ...saleWithItems });
      prisma.sale.delete.mockResolvedValue({ id: 'sale-1' });

      const result = await service.remove('sale-1');

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { increment: 2 } },
      });
      expect(prisma.sale.delete).toHaveBeenCalledWith({
        where: { id: 'sale-1' },
      });
      expect(result).toEqual({ success: true });
    });

    it('does not restore stock when deleting a cancelled sale', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        ...saleWithItems,
        status: 'CANCELLED',
      });
      prisma.sale.delete.mockResolvedValue({ id: 'sale-1' });

      await service.remove('sale-1');

      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(prisma.sale.delete).toHaveBeenCalledWith({
        where: { id: 'sale-1' },
      });
    });

    it('throws when sale is not found', async () => {
      prisma.sale.findUnique.mockResolvedValue(null);

      await expect(service.remove('sale-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});