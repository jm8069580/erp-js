import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountNature, AccountType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdateAccountingConfigDto } from './dto/update-accounting-config.dto';

const DEFAULT_NATURE: Record<AccountType, AccountNature> = {
  [AccountType.ACTIVO]: AccountNature.DEBITO,
  [AccountType.PASIVO]: AccountNature.CREDITO,
  [AccountType.PATRIMONIO]: AccountNature.CREDITO,
  [AccountType.INGRESO]: AccountNature.CREDITO,
  [AccountType.COSTO]: AccountNature.DEBITO,
  [AccountType.GASTO]: AccountNature.DEBITO,
};

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async findAll(isActive?: boolean) {
    return this.prisma.account.findMany({
      where: isActive === undefined ? {} : { isActive },
      include: {
        _count: { select: { journalLines: true, children: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async create(dto: CreateAccountDto) {
    const existing = await this.prisma.account.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(`Account code ${dto.code} already exists`);
    }

    let parentId: string | undefined;
    if (dto.parentId) {
      const parent = await this.prisma.account.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || !parent.isActive) {
        throw new BadRequestException(
          `Parent account ${dto.parentId} not found or is inactive`,
        );
      }
      if (parent.type !== dto.type) {
        throw new BadRequestException(
          'Child account must share the account type of its parent',
        );
      }
      parentId = parent.id;
    }

    const nature = dto.nature ?? DEFAULT_NATURE[dto.type];

    return this.prisma.account.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        nature,
        parentId,
      },
    });
  }

  async update(id: string, dto: UpdateAccountDto) {
    const account = await this.findAccountOrThrow(id);

    if (dto.isActive === false) {
      const [activeChildren, journalLines] = await this.prisma.$transaction([
        this.prisma.account.count({ where: { parentId: id, isActive: true } }),
        this.prisma.journalEntryLine.count({ where: { accountId: id } }),
      ]);
      if (activeChildren > 0) {
        throw new BadRequestException(
          'Cannot deactivate an account that has active children',
        );
      }
      if (journalLines > 0) {
        throw new BadRequestException(
          'Cannot deactivate an account that has journal activity',
        );
      }
    }

    return this.prisma.account.update({
      where: { id },
      data: {
        name: dto.name ?? account.name,
        isActive: dto.isActive ?? account.isActive,
      },
    });
  }

  async getConfig() {
    return this.prisma.accountingConfig.findUnique({ where: { id: 1 } });
  }

  async updateConfig(dto: UpdateAccountingConfigDto) {
    const config = await this.prisma.accountingConfig.findUnique({
      where: { id: 1 },
    });
    if (!config) {
      throw new BadRequestException('Accounting config is not initialized');
    }

    const data: { [key: string]: string } = {};
    if (dto.salesAccountId) {
      await this.validateConfigAccount(
        dto.salesAccountId,
        AccountType.INGRESO,
        'Sales',
      );
      data.salesAccountId = dto.salesAccountId;
    }
    if (dto.itbmsAccountId) {
      await this.validateConfigAccount(
        dto.itbmsAccountId,
        AccountType.PASIVO,
        'ITBMS',
      );
      data.itbmsAccountId = dto.itbmsAccountId;
    }
    if (dto.receivableAccountId) {
      await this.validateConfigAccount(
        dto.receivableAccountId,
        AccountType.ACTIVO,
        'Receivables',
      );
      data.receivableAccountId = dto.receivableAccountId;
    }

    return this.prisma.accountingConfig.update({
      where: { id: 1 },
      data,
    });
  }

  private async findAccountOrThrow(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }

  private async validateConfigAccount(
    accountId: string,
    expectedType: AccountType,
    label: string,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account || !account.isActive) {
      throw new BadRequestException(`${label} account not found or is inactive`);
    }
    if (account.type !== expectedType) {
      throw new BadRequestException(
        `${label} account must be of type ${expectedType}`,
      );
    }
    return account;
  }
}