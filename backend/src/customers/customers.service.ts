import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: createCustomerDto,
    });
  }

  async findAll() {
    return this.prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { sales: true } } },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { product: true } }, createdBy: true },
        },
        _count: { select: { sales: true } },
      },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
      include: { _count: { select: { sales: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const relatedSales = await this.prisma.sale.count({
      where: { customerId: id },
    });
    if (relatedSales > 0) {
      throw new ConflictException(
        'Cannot delete customer because it has related sales records. Set isActive=false instead.',
      );
    }

    return this.prisma.customer.delete({ where: { id } });
  }
}