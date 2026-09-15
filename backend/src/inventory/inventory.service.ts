import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryMovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInventoryMovementDto,
  ListInventoryMovementsQueryDto,
} from './dto/create-inventory-movement.dto';

type InventoryClient = Prisma.TransactionClient;

const MOVEMENT_INCLUDE = {
  product: {
    select: {
      id: true,
      name: true,
      sku: true,
      stock: true,
      isActive: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.InventoryMovementInclude;

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInventoryMovementDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const product = await this.findProductTx(tx, dto.productId);

      if (dto.type !== InventoryMovementType.ADJUSTMENT && dto.quantity < 1) {
        throw new BadRequestException(
          `Quantity must be at least 1 for ${dto.type} movements`,
        );
      }

      let stock = product.stock;

      if (dto.type === InventoryMovementType.ENTRY) {
        stock += dto.quantity;
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { increment: dto.quantity } },
        });
      } else if (dto.type === InventoryMovementType.EXIT) {
        if (product.stock < dto.quantity) {
          throw new BadRequestException(
            `Not enough stock for product ${product.sku} (available: ${product.stock})`,
          );
        }
        stock -= dto.quantity;
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: dto.quantity } },
        });
      } else {
        stock = dto.quantity;
        await tx.product.update({
          where: { id: product.id },
          data: { stock: dto.quantity },
        });
      }

      return tx.inventoryMovement.create({
        data: {
          productId: product.id,
          type: dto.type,
          quantity: dto.quantity,
          stockAfter: stock,
          reason: dto.reason,
          createdById: userId,
        },
        include: MOVEMENT_INCLUDE,
      });
    });
  }

  async findAll(query: ListInventoryMovementsQueryDto) {
    const where: Prisma.InventoryMovementWhereInput = {};
    if (query.productId) where.productId = query.productId;
    if (query.type) where.type = query.type;

    return this.prisma.inventoryMovement.findMany({
      where,
      include: MOVEMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const movement = await this.prisma.inventoryMovement.findUnique({
      where: { id },
      include: MOVEMENT_INCLUDE,
    });
    if (!movement) {
      throw new NotFoundException(`Inventory movement with ID ${id} not found`);
    }
    return movement;
  }

  private async findProductTx(tx: InventoryClient, id: string) {
    const product = await tx.product.findUnique({ where: { id } });
    if (!product || !product.isActive) {
      throw new NotFoundException(`Product ${id} not found or is inactive`);
    }
    return product;
  }
}