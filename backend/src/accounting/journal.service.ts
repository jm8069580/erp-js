import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JournalEntryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateJournalEntryDto,
  CreateJournalEntryLineDto,
  UpdateJournalEntryDto,
} from './dto/create-journal-entry.dto';
import { ListJournalEntriesQueryDto } from './dto/list-journal-entries.query';
import { round2 } from './money.util';

const JOURNAL_INCLUDE = {
  lines: {
    include: { account: true },
    orderBy: { id: 'asc' },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
  invoice: {
    select: {
      id: true,
      serie: true,
      folio: true,
    },
  },
} satisfies Prisma.JournalEntryInclude;

type JournalClient = Prisma.TransactionClient;

@Injectable()
export class JournalService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateJournalEntryDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const { lines, debits, credits } = await this.validateLines(tx, dto.lines);

      if (Math.abs(debits - credits) > 0.005) {
        throw new BadRequestException(
          `Journal entry is not balanced: debits ${debits} vs credits ${credits}`,
        );
      }

      return tx.journalEntry.create({
        data: {
          date: dto.date ? new Date(dto.date) : new Date(),
          concept: dto.concept,
          reference: dto.reference,
          status: JournalEntryStatus.DRAFT,
          createdById: userId,
          lines: { create: lines },
        },
        include: JOURNAL_INCLUDE,
      });
    });
  }

  async findAll(query: ListJournalEntriesQueryDto) {
    const where: Prisma.JournalEntryWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.accountId) {
      where.lines = { some: { accountId: query.accountId } };
    }
    const date: Prisma.JournalEntryWhereInput['date'] = {};
    if (query.dateFrom) date.gte = new Date(query.dateFrom);
    if (query.dateTo) date.lte = new Date(query.dateTo);
    if (Object.keys(date).length > 0) where.date = date;

    return this.prisma.journalEntry.findMany({
      where,
      include: JOURNAL_INCLUDE,
      orderBy: [{ date: 'desc' }, { number: 'desc' }],
    });
  }

  async findOne(id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: JOURNAL_INCLUDE,
    });
    if (!entry) {
      throw new NotFoundException(`Journal entry with ID ${id} not found`);
    }
    return entry;
  }

  async update(id: string, dto: UpdateJournalEntryDto) {
    const entry = await this.findOne(id);
    this.ensureEditable(entry, 'edited');

    return this.prisma.journalEntry.update({
      where: { id },
      data: {
        date: dto.date ? new Date(dto.date) : entry.date,
        concept: dto.concept ?? entry.concept,
        reference: dto.reference ?? entry.reference,
      },
      include: JOURNAL_INCLUDE,
    });
  }

  async book(id: string) {
    const entry = await this.findOne(id);
    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new BadRequestException(
        `Only draft journal entries can be booked (current: ${entry.status})`,
      );
    }
    return this.prisma.journalEntry.update({
      where: { id },
      data: { status: JournalEntryStatus.BOOKED },
      include: JOURNAL_INCLUDE,
    });
  }

  async cancel(id: string) {
    const entry = await this.findOne(id);
    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new BadRequestException(
        `Only draft journal entries can be cancelled (current: ${entry.status})`,
      );
    }
    this.ensureEditable(entry, 'cancelled');
    return this.prisma.journalEntry.update({
      where: { id },
      data: { status: JournalEntryStatus.CANCELLED },
      include: JOURNAL_INCLUDE,
    });
  }

  private async validateLines(
    tx: JournalClient,
    lines: CreateJournalEntryLineDto[],
  ) {
    const validated: { accountId: string; description: string | undefined; debit: number; credit: number }[] = [];
    let debits = 0;
    let credits = 0;

    for (const line of lines) {
      const debit = line.debit ?? 0;
      const credit = line.credit ?? 0;
      if (debit <= 0 && credit <= 0) {
        throw new BadRequestException(
          'Each journal line needs a positive debit or credit',
        );
      }
      if (debit > 0 && credit > 0) {
        throw new BadRequestException(
          'A journal line cannot have both debit and credit',
        );
      }

      const account = await tx.account.findUnique({
        where: { id: line.accountId },
      });
      if (!account || !account.isActive) {
        throw new BadRequestException(
          `Account ${line.accountId} not found or is inactive`,
        );
      }

      debits = round2(debits + debit);
      credits = round2(credits + credit);
      validated.push({
        accountId: line.accountId,
        description: line.description,
        debit,
        credit,
      });
    }

    return { lines: validated, debits, credits };
  }

  private ensureEditable(
    entry: { status: JournalEntryStatus; invoiceId: string | null; reversalOfId: string | null },
    action: string,
  ) {
    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new BadRequestException(
        `Only draft journal entries can be ${action} (current: ${entry.status})`,
      );
    }
    if (entry.invoiceId || entry.reversalOfId) {
      throw new BadRequestException(
        `Generated journal entries cannot be ${action}`,
      );
    }
  }
}