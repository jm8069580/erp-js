import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountsService } from './accounts.service';
import {
  AccountsController,
  AccountingConfigController,
} from './accounts.controller';
import { JournalService } from './journal.service';
import { JournalController } from './journal.controller';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    AccountsController,
    AccountingConfigController,
    JournalController,
    ReportingController,
  ],
  providers: [AccountsService, JournalService, ReportingService],
})
export class AccountingModule {}