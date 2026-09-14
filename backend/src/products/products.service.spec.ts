import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;

  const product = {
    id: 'prod-1',
    name: 'Laptop',
    sku: 'LAP-001',
    price: 500,
    stock: 10,
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      saleItem: {
        count: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ProductsService);
  });

  it('creates a product', async () => {
    prisma.product.create.mockResolvedValue(product);

    const dto = {
      name: 'Laptop',
      sku: 'LAP-001',
      price: 500,
      stock: 10,
    } as any;

    await expect(service.create(dto)).resolves.toEqual(product);
    expect(prisma.product.create).toHaveBeenCalledWith({ data: dto });
  });

  it('lists all products ordered by date desc', async () => {
    prisma.product.findMany.mockResolvedValue([product]);

    await expect(service.findAll()).resolves.toEqual([product]);
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    });
  });

  it('finds a product by id', async () => {
    prisma.product.findUnique.mockResolvedValue(product);

    await expect(service.findOne('prod-1')).resolves.toEqual(product);
  });

  it('throws when product is not found', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(service.findOne('prod-1')).rejects.toThrow(NotFoundException);
  });

  it('updates a product', async () => {
    prisma.product.findUnique.mockResolvedValue(product);
    prisma.product.update.mockResolvedValue({ ...product, price: 600 });

    const result = await service.update('prod-1', { price: 600 } as any);

    expect(result.price).toBe(600);
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { price: 600 },
    });
  });

  it('throws when updating an unknown product', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(
      service.update('prod-1', { price: 600 } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('deletes a product without sales records', async () => {
    prisma.product.findUnique.mockResolvedValue(product);
    prisma.saleItem.count.mockResolvedValue(0);
    prisma.product.delete.mockResolvedValue(product);

    await expect(service.remove('prod-1')).resolves.toEqual(product);
    expect(prisma.saleItem.count).toHaveBeenCalledWith({
      where: { productId: 'prod-1' },
    });
  });

  it('blocks deleting a product with sales records', async () => {
    prisma.product.findUnique.mockResolvedValue(product);
    prisma.saleItem.count.mockResolvedValue(3);

    await expect(service.remove('prod-1')).rejects.toThrow(ConflictException);
    expect(prisma.product.delete).not.toHaveBeenCalled();
  });
});