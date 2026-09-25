import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { FelModule } from '../fel/fel.module';

@Module({
  imports: [PrismaModule, FelModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule {}