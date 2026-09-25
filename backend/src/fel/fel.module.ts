import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FelService } from './fel.service';
import { FelController } from './fel.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
    }),
  ],
  controllers: [FelController],
  providers: [FelService],
  exports: [FelService],
})
export class FelModule {}