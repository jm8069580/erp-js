import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JournalEntryStatus } from '@prisma/client';
import { JournalService } from './journal.service';
import { PrismaService } from '../prisma/prisma.service';

describe('JournalService', () => {
  let service: JournalService;
  let prisma: any;

  const account1 = { id: 'acc-1', code: '1.1.01', name: 'CAJA', type: 'ACTIVO', nature: 'DEBITO', isActive: true };
  const account2 = { id: 'acc-2', code: '4.1.01', name: 'VENTA', type: 'INGRESO', nature: 'CREDITO', isActive: true };

  const draftEntry = {
    id: 'je-1',
    number: 1,
    date: new Date('2026-09-15'),
    concept: 'Test',
    reference: null,
    status: JournalEntryStatus.DRAFT,
    invoiceId: null,
    reversalOfId: null,
    createdById: 'user-1',
    lines: [],
    createdBy: { id: 'user-1', email: 'a@b.com', firstName: 'A', lastName: 'B' },
    invoice: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      journalEntry: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      account: { findUnique: jest.fn() },
      $transaction: jest.fn((input: any) =>
        typeof input === 'function' ? input(prisma) : Promise.resolve(input),
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        JournalService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(JournalService);
  });

  describe('create', () => {
    beforeEach(() => {
      prisma.account.findUnique
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(account2);
      prisma.journalEntry.create.mockImplementation(({ data, include }: any) =>
        Promise.resolve({ ...draftEntry, ...data, lines: data.lines?.create, id: 'je-new' }),
      );
    });

    it('creates a balanced draft entry', async () => {
      const result = await service.create(
        {
          concept: 'Test',
          lines: [
            { accountId: 'acc-1', debit: 100, credit: 0 },
            { accountId: 'acc-2', debit: 0, credit: 100 },
          ],
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(prisma.journalEntry.create).toHaveBeenCalled();
    });

    it('rejects unbalanced entries', async () => {
      await expect(
        service.create(
          {
            concept: 'X',
            lines: [
              { accountId: 'acc-1', debit: 100, credit: 0 },
              { accountId: 'acc-2', debit: 0, credit: 50 },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow('not balanced');
    });

    it('rejects lines without debit or credit', async () => {
      prisma.account.findUnique.mockResolvedValueOnce(account1);

      await expect(
        service.create(
          {
            concept: 'X',
            lines: [{ accountId: 'acc-1', debit: 0, credit: 0 }],
          },
          'user-1',
        ),
      ).rejects.toThrow('positive debit or credit');
    });

    it('rejects lines with both debit and credit', async () => {
      prisma.account.findUnique.mockResolvedValueOnce(account1);

      await expect(
        service.create(
          {
            concept: 'X',
            lines: [{ accountId: 'acc-1', debit: 50, credit: 50 }],
          },
          'user-1',
        ),
      ).rejects.toThrow('cannot have both');
    });

    it('rejects inactive account', async () => {
      prisma.account.findUnique.mockReset();
      prisma.account.findUnique.mockResolvedValue({ ...account1, isActive: false });

      await expect(
        service.create(
          {
            concept: 'X',
            lines: [
              { accountId: 'acc-1', debit: 10, credit: 0 },
              { accountId: 'acc-2', debit: 0, credit: 10 },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow('inactive');
    });
  });

  describe('findAll / findOne', () => {
    it('returns entries', async () => {
      prisma.journalEntry.findMany.mockResolvedValue([draftEntry]);
      const result = await service.findAll({});
      expect(result).toEqual([draftEntry]);
    });

    it('filters by accountId', async () => {
      prisma.journalEntry.findMany.mockResolvedValue([]);
      await service.findAll({ accountId: 'acc-1' });
      expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lines: { some: { accountId: 'acc-1' } },
          }),
        }),
      );
    });

    it('throws NotFound when missing', async () => {
      prisma.journalEntry.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates a draft entry', async () => {
      prisma.journalEntry.findUnique.mockResolvedValue(draftEntry);
      prisma.journalEntry.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...draftEntry, ...data }),
      );

      const result = await service.update('je-1', { concept: 'Updated' });
      expect(result.concept).toBe('Updated');
    });

    it('rejects updating a booked entry', async () => {
      prisma.journalEntry.findUnique.mockResolvedValue({
        ...draftEntry,
        status: JournalEntryStatus.BOOKED,
      });

      await expect(
        service.update('je-1', { concept: 'X' }),
      ).rejects.toThrow('edited');
    });

    it('rejects updating an entry linked to invoice', async () => {
      prisma.journalEntry.findUnique.mockResolvedValue({
        ...draftEntry,
        invoiceId: 'inv-1',
      });

      await expect(
        service.update('je-1', { concept: 'X' }),
      ).rejects.toThrow('Generated');
    });
  });

  describe('book', () => {
    it('books a draft entry', async () => {
      prisma.journalEntry.findUnique.mockResolvedValue(draftEntry);
      prisma.journalEntry.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...draftEntry, ...data }),
      );

      const result = await service.book('je-1');
      expect(result.status).toBe(JournalEntryStatus.BOOKED);
    });

    it('rejects booking a non-draft entry', async () => {
      prisma.journalEntry.findUnique.mockResolvedValue({
        ...draftEntry,
        status: JournalEntryStatus.BOOKED,
      });

      await expect(service.book('je-1')).rejects.toThrow('Only draft');
    });
  });

  describe('cancel', () => {
    it('cancels a draft entry', async () => {
      prisma.journalEntry.findUnique.mockResolvedValue(draftEntry);
      prisma.journalEntry.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...draftEntry, ...data }),
      );

      const result = await service.cancel('je-1');
      expect(result.status).toBe(JournalEntryStatus.CANCELLED);
    });

    it('rejects cancelling a booked entry', async () => {
      prisma.journalEntry.findUnique.mockResolvedValue({
        ...draftEntry,
        status: JournalEntryStatus.BOOKED,
      });

      await expect(service.cancel('je-1')).rejects.toThrow('cancelled');
    });

    it('rejects cancelling a generated entry', async () => {
      prisma.journalEntry.findUnique.mockResolvedValue({
        ...draftEntry,
        reversalOfId: 'inv-1',
      });

      await expect(service.cancel('je-1')).rejects.toThrow('Generated');
    });
  });
});