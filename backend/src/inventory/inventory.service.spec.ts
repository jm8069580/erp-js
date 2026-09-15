import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryMovementType } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: any;

  const product = {
    id: 'prod-1',
    name: 'Laptop',
    sku: 'LAP-001',
    price: 500,
    stock: 10,
    isActive: true,
  };

  const movement = {
    id: 'mov-1',
    number: 1,
    productId: 'prod-1',
    type: InventoryMovementType.ENTRY,
    quantity: 5,
    stockAfter: 15,
    reason: 'Compra',
    saleId: null,
    createdById: 'user-1',
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      inventoryMovement: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(prisma),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(InventoryService);
  });

  describe('create', () => {
    it('registers an ENTRY movement and increments stock', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      const updated = { ...product, stock: 15 };
      prisma.product.update.mockResolvedValue(updated);
      prisma.inventoryMovement.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...movement, ...data }),
      );

      const result = await service.create(
        {
          productId: 'prod-1',
          type: InventoryMovementType.ENTRY,
          quantity: 5,
          reason: 'Compra',
        },
        'user-1',
      );

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { increment: 5 } },
      });
      expect(prisma.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'prod-1',
            type: InventoryMovementType.ENTRY,
            quantity: 5,
            stockAfter: 15,
            reason: 'Compra',
            createdById: 'user-1',
          }),
        }),
      );
      expect(result.stockAfter).toBe(15);
    });

    it('registers an EXIT movement and decrements stock', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      const updated = { ...product, stock: 8 };
      prisma.product.update.mockResolvedValue(updated);
      prisma.inventoryMovement.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...movement, ...data }),
      );

      await service.create(
        {
          productId: 'prod-1',
          type: InventoryMovementType.EXIT,
          quantity: 2,
        },
        'user-1',
      );

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { decrement: 2 } },
      });
      expect(prisma.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stockAfter: 8 }),
        }),
      );
    });

    it('rejects an EXIT without enough stock', async () => {
      prisma.product.findUnique.mockResolvedValue(product);

      await expect(
        service.create(
          { productId: 'prod-1', type: InventoryMovementType.EXIT, quantity: 50 },
          'user-1',
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Not enough stock for product LAP-001 (available: 10)',
        ),
      );
      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(prisma.inventoryMovement.create).not.toHaveBeenCalled();
    });

    it('registers an ADJUSTMENT that sets the absolute stock', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.product.update.mockResolvedValue({ ...product, stock: 25 });
      prisma.inventoryMovement.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...movement, ...data }),
      );

      const result = await service.create(
        { productId: 'prod-1', type: InventoryMovementType.ADJUSTMENT, quantity: 25 },
        'user-1',
      );

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: 25 },
      });
      expect(result.stockAfter).toBe(25);
    });

    it('rejects a zero quantity for non-adjustment movements', async () => {
      prisma.product.findUnique.mockResolvedValue(product);

      await expect(
        service.create(
          { productId: 'prod-1', type: InventoryMovementType.ENTRY, quantity: 0 },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.inventoryMovement.create).not.toHaveBeenCalled();
    });

    it('rejects an unknown or inactive product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            productId: 'prod-x',
            type: InventoryMovementType.ENTRY,
            quantity: 5,
          },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.inventoryMovement.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll / findOne', () => {
    it('lists movements without filters', async () => {
      prisma.inventoryMovement.findMany.mockResolvedValue([movement]);

      const result = await service.findAll({});

      expect(result).toEqual([movement]);
      expect(prisma.inventoryMovement.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters by product id and type', async () => {
      prisma.inventoryMovement.findMany.mockResolvedValue([movement]);

      await service.findAll({ productId: 'prod-1', type: InventoryMovementType.ENTRY });

      expect(prisma.inventoryMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 'prod-1', type: InventoryMovementType.ENTRY },
        }),
      );
    });

    it('finds a movement by id', async () => {
      prisma.inventoryMovement.findUnique.mockResolvedValue(movement);

      await expect(service.findOne('mov-1')).resolves.toEqual(movement);
    });

    it('throws when movement is not found', async () => {
      prisma.inventoryMovement.findUnique.mockResolvedValue(null);

      await expect(service.findOne('mov-1')).rejects.toThrow(NotFoundException);
    });
  });
});