import { Test } from '@nestjs/testing';
import { StatsService } from './stats.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StatsService', () => {
  let service: StatsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { count: jest.fn() },
      product: { count: jest.fn() },
      sale: {
        count: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [StatsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(StatsService);
  });

  it('returns totals, actives and revenue from completed sales', async () => {
    prisma.user.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3);
    prisma.product.count
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(18);
    prisma.sale.count.mockResolvedValue(7);
    prisma.sale.aggregate.mockResolvedValue({ _sum: { total: 1500 } });

    await expect(service.getStats()).resolves.toEqual({
      users: { total: 5, active: 3 },
      products: { total: 20, active: 18 },
      sales: { total: 7, revenue: 1500 },
    });
  });

  it('falls back to zero revenue when there are no sales', async () => {
    prisma.user.count.mockResolvedValue(0);
    prisma.product.count.mockResolvedValue(0);
    prisma.sale.count.mockResolvedValue(0);
    prisma.sale.aggregate.mockResolvedValue({ _sum: { total: null } });

    const result = await service.getStats();

    expect(result.sales.revenue).toBe(0);
  });
});