import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { NotionModule } from './notion/notion.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UsersModule,
    NotionModule,
    ProductsModule,
    SalesModule,
    StatsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
