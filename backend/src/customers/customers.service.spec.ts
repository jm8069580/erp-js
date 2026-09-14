import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: any;

  const customer = {
    id: 'cust-1',
    number: 1,
    name: 'Juan Pérez',
    email: 'juan@example.com',
    phone: null,
    address: null,
    taxId: null,
    notes: null,
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      customer: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      sale: {
        count: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(CustomersService);
  });

  it('creates a customer', async () => {
    prisma.customer.create.mockResolvedValue(customer);

    const dto = { name: 'Juan Pérez', email: 'juan@example.com' } as any;

    await expect(service.create(dto)).resolves.toEqual(customer);
    expect(prisma.customer.create).toHaveBeenCalledWith({ data: dto });
  });

  it('lists customers with sales count', async () => {
    prisma.customer.findMany.mockResolvedValue([customer]);

    await expect(service.findAll()).resolves.toEqual([customer]);
    expect(prisma.customer.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { sales: true } } },
    });
  });

  it('finds a customer by id including sales', async () => {
    prisma.customer.findUnique.mockResolvedValue(customer);

    await expect(service.findOne('cust-1')).resolves.toEqual(customer);
    expect(prisma.customer.findUnique).toHaveBeenCalledWith({
      where: { id: 'cust-1' },
      include: expect.objectContaining({
        sales: expect.any(Object),
        _count: { select: { sales: true } },
      }),
    });
  });

  it('throws when customer is not found', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);

    await expect(service.findOne('cust-1')).rejects.toThrow(NotFoundException);
  });

  it('updates a customer', async () => {
    prisma.customer.findUnique.mockResolvedValue(customer);
    prisma.customer.update.mockResolvedValue({ ...customer, phone: '555-0000' });

    const result = await service.update('cust-1', { phone: '555-0000' } as any);

    expect(result.phone).toBe('555-0000');
    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cust-1' },
        data: { phone: '555-0000' },
      }),
    );
  });

  it('throws when updating an unknown customer', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);

    await expect(
      service.update('cust-1', { phone: '555-0000' } as any),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.customer.update).not.toHaveBeenCalled();
  });

  it('deletes a customer without sales records', async () => {
    prisma.customer.findUnique.mockResolvedValue(customer);
    prisma.sale.count.mockResolvedValue(0);
    prisma.customer.delete.mockResolvedValue(customer);

    await expect(service.remove('cust-1')).resolves.toEqual(customer);
    expect(prisma.sale.count).toHaveBeenCalledWith({
      where: { customerId: 'cust-1' },
    });
  });

  it('blocks deleting a customer with sales records', async () => {
    prisma.customer.findUnique.mockResolvedValue(customer);
    prisma.sale.count.mockResolvedValue(2);

    await expect(service.remove('cust-1')).rejects.toThrow(ConflictException);
    expect(prisma.customer.delete).not.toHaveBeenCalled();
  });
});