import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [users, products, activeUsers, activeProducts] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.product.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.product.count({ where: { isActive: true } }),
    ]);

    return {
      users: { total: users, active: activeUsers },
      products: { total: products, active: activeProducts },
      sales: 0,
      revenue: 0,
    };
  }
}
