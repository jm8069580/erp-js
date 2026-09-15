import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReportingService', () => {
  let service: ReportingService;
  let prisma: any;

  const account = {
    id: 'acc-1',
    code: '1.1.01',
    name: 'CAJA',
    type: 'ACTIVO',
    nature: 'DEBITO',
  };

  beforeEach(async () => {
    prisma = {
      journalEntryLine: {
        findMany: jest.fn(),
      },
      account: {
        findUnique: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReportingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ReportingService);
  });

  describe('trialBalance', () => {
    it('aggregates debits and credits per account', async () => {
      prisma.journalEntryLine.findMany.mockResolvedValue([
        { accountId: 'acc-1', debit: 100, credit: 0, account },
        { accountId: 'acc-1', debit: 0, credit: 30, account },
        { accountId: 'acc-2', debit: 0, credit: 70, account: { ...account, id: 'acc-2', code: '4.1.01', name: 'VENTA' } },
      ]);

      const result = await service.trialBalance();

      expect(result.accounts).toHaveLength(2);
      expect(result.accounts[0].code).toBe('1.1.01');
      expect(result.accounts[0].debit).toBe(100);
      expect(result.accounts[0].credit).toBe(30);
      expect(result.accounts[0].balance).toBe(70);
      expect(result.totals.debit).toBe(100);
      expect(result.totals.credit).toBe(100);
    });

    it('returns empty result with no data', async () => {
      prisma.journalEntryLine.findMany.mockResolvedValue([]);
      const result = await service.trialBalance();
      expect(result.accounts).toHaveLength(0);
      expect(result.totals.debit).toBe(0);
      expect(result.totals.credit).toBe(0);
    });
  });

  describe('ledger', () => {
    it('returns movements with running balance', async () => {
      prisma.account.findUnique.mockResolvedValue(account);
      prisma.journalEntryLine.findMany.mockResolvedValue([
        {
          accountId: 'acc-1',
          debit: 100,
          credit: 0,
          description: 'a',
          entryId: 'e-1',
          entry: { number: 1, date: new Date('2026-09-01'), concept: 'Debit', reference: null },
        },
        {
          accountId: 'acc-1',
          debit: 0,
          credit: 30,
          description: 'b',
          entryId: 'e-2',
          entry: { number: 2, date: new Date('2026-09-02'), concept: 'Credit', reference: null },
        },
      ]);

      const result = await service.ledger('acc-1');

      expect(result.account.id).toBe('acc-1');
      expect(result.movements).toHaveLength(2);
      expect(result.movements[0].balance).toBe(100);
      expect(result.movements[1].balance).toBe(70);
    });

    it('throws when account not found', async () => {
      prisma.account.findUnique.mockResolvedValue(null);
      await expect(service.ledger('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('passes date filters to the query', async () => {
      prisma.account.findUnique.mockResolvedValue(account);
      prisma.journalEntryLine.findMany.mockResolvedValue([]);

      await service.ledger('acc-1', { dateFrom: '2026-09-01', dateTo: '2026-09-30' });

      expect(prisma.journalEntryLine.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entry: expect.objectContaining({
              status: 'BOOKED',
              date: {
                gte: new Date('2026-09-01'),
                lte: new Date('2026-09-30'),
              },
            }),
          }),
        }),
      );
    });
  });
});