import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { NotionModule } from './notion/notion.module';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './sales/sales.module';
import { StatsModule } from './stats/stats.module';
import { AccountingModule } from './accounting/accounting.module';
import { InvoicesModule } from './invoices/invoices.module';
import { FelModule } from './fel/fel.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UsersModule,
    NotionModule,
    ProductsModule,
    CustomersModule,
    InventoryModule,
    SalesModule,
    StatsModule,
    AccountingModule,
    InvoicesModule,
    FelModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
