import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountNature, AccountType } from '@prisma/client';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AccountsService', () => {
  let service: AccountsService;
  let prisma: any;

  const baseAccount = {
    id: 'acc-1',
    code: '1.1.01',
    name: 'CAJA',
    type: AccountType.ACTIVO,
    nature: AccountNature.DEBITO,
    parentId: null,
    isActive: true,
  };

  const childAccount = {
    ...baseAccount,
    id: 'acc-child',
    code: '1.1.01.001',
    name: 'Caja Principal',
    parentId: 'acc-1',
  };

  beforeEach(async () => {
    prisma = {
      account: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      accountingConfig: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      journalEntryLine: {
        count: jest.fn(),
      },
      $transaction: jest.fn((input: any) =>
        Array.isArray(input)
          ? Promise.all(input)
          : typeof input === 'function'
            ? input(prisma)
            : input,
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(AccountsService);
  });

  describe('findAll', () => {
    it('lists all accounts', async () => {
      prisma.account.findMany.mockResolvedValue([baseAccount]);

      const result = await service.findAll();

      expect(result).toEqual([baseAccount]);
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: {},
        include: { _count: { select: { journalLines: true, children: true } } },
        orderBy: { code: 'asc' },
      });
    });

    it('filters by isActive', async () => {
      prisma.account.findMany.mockResolvedValue([baseAccount]);

      await service.findAll(true);

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });
  });

  describe('create', () => {
    it('creates an account with derived nature', async () => {
      prisma.account.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      prisma.account.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...baseAccount, ...data, id: 'new-acc' }),
      );

      const result = await service.create({
        code: '1.1.01',
        name: 'CAJA',
        type: AccountType.ACTIVO,
      });

      expect(result.nature).toBe(AccountNature.DEBITO);
      expect(prisma.account.create).toHaveBeenCalled();
    });

    it('creates an account with explicit nature', async () => {
      prisma.account.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      prisma.account.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...baseAccount, ...data, id: 'new-acc' }),
      );

      const result = await service.create({
        code: '1.2.06',
        name: 'DEPRECIACIÓN',
        type: AccountType.ACTIVO,
        nature: AccountNature.CREDITO,
      });

      expect(result.nature).toBe(AccountNature.CREDITO);
    });

    it('creates a child account linked to parent', async () => {
      prisma.account.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(baseAccount);
      prisma.account.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...childAccount, ...data }),
      );

      await service.create({
        code: '1.1.01.001',
        name: 'Caja Principal',
        type: AccountType.ACTIVO,
        parentId: 'acc-1',
      });

      expect(prisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ parentId: 'acc-1' }),
        }),
      );
    });

    it('rejects duplicate code', async () => {
      prisma.account.findUnique.mockResolvedValue(baseAccount);

      await expect(
        service.create({ code: '1.1.01', name: 'Dup', type: AccountType.ACTIVO }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects inactive parent', async () => {
      prisma.account.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...baseAccount, isActive: false });

      await expect(
        service.create({
          code: '1.1.01.001',
          name: 'X',
          type: AccountType.ACTIVO,
          parentId: 'acc-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects parent with mismatched type', async () => {
      prisma.account.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...baseAccount, type: AccountType.PASIVO });

      await expect(
        service.create({
          code: '2.1.01',
          name: 'Y',
          type: AccountType.ACTIVO,
          parentId: 'acc-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('updates account name', async () => {
      prisma.account.findUnique.mockResolvedValue(baseAccount);
      prisma.account.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...baseAccount, ...data }),
      );

      const result = await service.update('acc-1', { name: 'Caja General' });

      expect(result.name).toBe('Caja General');
    });

    it('deactivates an account without activity', async () => {
      prisma.account.findUnique.mockResolvedValue(baseAccount);
      prisma.account.count.mockResolvedValue(0);
      prisma.account.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...baseAccount, isActive: false, ...data }),
      );

      const result = await service.update('acc-1', { isActive: false });

      expect(result.isActive).toBe(false);
    });

    it('blocks deactivation when active children exist', async () => {
      prisma.account.findUnique.mockResolvedValue(baseAccount);
      prisma.account.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

      await expect(
        service.update('acc-1', { isActive: false }),
      ).rejects.toThrow('active children');
    });

    it('blocks deactivation when journal lines exist', async () => {
      prisma.account.findUnique.mockResolvedValue(baseAccount);
      prisma.account.count.mockResolvedValue(0);
      prisma.journalEntryLine.count.mockResolvedValue(5);

      await expect(
        service.update('acc-1', { isActive: false }),
      ).rejects.toThrow('journal activity');
    });

    it('throws NotFound for unknown id', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(
        service.update('bad-id', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getConfig', () => {
    it('returns config when present', async () => {
      prisma.accountingConfig.findUnique.mockResolvedValue({ id: 1, salesAccountId: 'a', itbmsAccountId: 'b', receivableAccountId: 'c' });
      await expect(service.getConfig()).resolves.toEqual({ id: 1, salesAccountId: 'a', itbmsAccountId: 'b', receivableAccountId: 'c' });
    });

    it('returns null when no config', async () => {
      prisma.accountingConfig.findUnique.mockResolvedValue(null);
      await expect(service.getConfig()).resolves.toBeNull();
    });
  });

  describe('updateConfig', () => {
    it('updates config fields after validating accounts', async () => {
      prisma.accountingConfig.findUnique.mockResolvedValue({ id: 1, salesAccountId: 'old', itbmsAccountId: 'old', receivableAccountId: 'old' });
      prisma.account.findUnique
        .mockResolvedValueOnce({ id: 'sales', type: AccountType.INGRESO, isActive: true })
        .mockResolvedValueOnce({ id: 'itbms', type: AccountType.PASIVO, isActive: true })
        .mockResolvedValueOnce({ id: 'recv', type: AccountType.ACTIVO, isActive: true });
      prisma.accountingConfig.update.mockImplementation(({ data }: any) => Promise.resolve({ id: 1, ...data }));

      const result = await service.updateConfig({
        salesAccountId: 'sales',
        itbmsAccountId: 'itbms',
        receivableAccountId: 'recv',
      });

      expect(result.salesAccountId).toBe('sales');
      expect(result.itbmsAccountId).toBe('itbms');
      expect(result.receivableAccountId).toBe('recv');
    });

    it('throws when config is missing', async () => {
      prisma.accountingConfig.findUnique.mockResolvedValue(null);

      await expect(service.updateConfig({ salesAccountId: 'x' })).rejects.toThrow('not initialized');
    });

    it('throws when account is wrong type', async () => {
      prisma.accountingConfig.findUnique.mockResolvedValue({ id: 1 });
      prisma.account.findUnique.mockResolvedValue({ id: 'a', type: AccountType.ACTIVO, isActive: true });

      await expect(service.updateConfig({ salesAccountId: 'a' })).rejects.toThrow('must be of type INGRESO');
    });
  });
});