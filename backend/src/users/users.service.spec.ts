import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const user = {
  id: 'user-1',
  email: 'user@erp.com',
  password: '$2a$10$hashed',
  firstName: 'Juan',
  lastName: 'Pérez',
  role: 'USER',
  isActive: true,
  createdAt: new Date(),
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('creates a user hashing the password', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }: any) => ({
      id: 'user-1',
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      isActive: true,
      createdAt: new Date(),
    }));

    const dto = {
      email: 'user@erp.com',
      password: 'secret123',
      firstName: 'Juan',
      lastName: 'Pérez',
    } as any;

    const result = await service.create(dto);

    expect(prisma.user.create).toHaveBeenCalled();
    const createArg = prisma.user.create.mock.calls[0][0].data;
    expect(createArg.password).not.toBe('secret123');
    expect(await bcrypt.compare('secret123', createArg.password)).toBe(true);
    expect(result.email).toBe('user@erp.com');
  });

  it('rejects a duplicated email', async () => {
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(
      service.create({ email: 'user@erp.com' } as any),
    ).rejects.toThrow(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('lists all users', async () => {
    prisma.user.findMany.mockResolvedValue([user]);

    await expect(service.findAll()).resolves.toEqual([user]);
  });

  it('finds a user by id', async () => {
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(service.findOne('user-1')).resolves.toEqual(user);
  });

  it('throws when user is not found by id', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.findOne('user-1')).rejects.toThrow(NotFoundException);
  });

  it('finds a user by email (with password)', async () => {
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(service.findByEmail('user@erp.com')).resolves.toEqual(user);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'user@erp.com' },
    });
  });

  it('updates a user hashing a new password', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockImplementation(async ({ data }: any) => ({
      ...user,
      ...data,
    }));

    const result = await service.update('user-1', {
      password: 'newsecret',
    } as any);

    const updateArg = prisma.user.update.mock.calls[0][0].data;
    expect(await bcrypt.compare('newsecret', updateArg.password)).toBe(true);
    expect(result.email).toBe('user@erp.com');
  });

  it('removes a user', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.delete.mockResolvedValue(user);

    await service.remove('user-1');

    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
  });

  it('throws when removing an unknown user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.remove('user-1')).rejects.toThrow(NotFoundException);
  });
});