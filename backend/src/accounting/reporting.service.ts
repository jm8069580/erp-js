import { Injectable, NotFoundException } from '@nestjs/common';
import { JournalEntryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { round2 } from './money.util';

export interface DateRangeQuery {
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaService) {}

  async trialBalance(query: DateRangeQuery = {}) {
    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        entry: {
          status: JournalEntryStatus.BOOKED,
          ...this.dateFilter(query),
        },
      },
      include: { account: true },
    });

    const byAccount = new Map<
      string,
      {
        accountId: string;
        code: string;
        name: string;
        type: string;
        nature: string;
        debit: number;
        credit: number;
      }
    >();

    for (const line of lines) {
      const current =
        byAccount.get(line.accountId) ?? {
          accountId: line.accountId,
          code: line.account.code,
          name: line.account.name,
          type: line.account.type,
          nature: line.account.nature,
          debit: 0,
          credit: 0,
        };
      current.debit = round2(current.debit + line.debit);
      current.credit = round2(current.credit + line.credit);
      byAccount.set(line.accountId, current);
    }

    const accounts = [...byAccount.values()]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((account) => ({
        ...account,
        balance: round2(account.debit - account.credit),
      }));

    const totals = accounts.reduce(
      (acc, account) => ({
        debit: round2(acc.debit + account.debit),
        credit: round2(acc.credit + account.credit),
      }),
      { debit: 0, credit: 0 },
    );

    return { totals, accounts };
  }

  async ledger(accountId: string, query: DateRangeQuery = {}) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found`);
    }

    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        accountId,
        entry: {
          status: JournalEntryStatus.BOOKED,
          ...this.dateFilter(query),
        },
      },
      include: {
        entry: {
          select: {
            number: true,
            date: true,
            concept: true,
            reference: true,
          },
        },
      },
      orderBy: { entry: { date: 'asc' } },
    });

    let balance = 0;
    const movements = lines.map((line) => {
      balance = round2(balance + line.debit - line.credit);
      return {
        entryId: line.entryId,
        entryNumber: line.entry.number,
        date: line.entry.date,
        concept: line.entry.concept,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
        balance,
      };
    });

    return {
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        nature: account.nature,
      },
      movements,
    };
  }

  private dateFilter(query: DateRangeQuery): Prisma.JournalEntryWhereInput {
    const date: Prisma.JournalEntryWhereInput['date'] = {};
    if (query.dateFrom) date.gte = new Date(query.dateFrom);
    if (query.dateTo) date.lte = new Date(query.dateTo);
    return Object.keys(date).length > 0 ? { date } : {};
  }
}