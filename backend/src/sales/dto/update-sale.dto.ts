import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SaleStatus } from '@prisma/client';

export class UpdateSaleDto {
  @ApiPropertyOptional({ example: 'María González' })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({ enum: SaleStatus })
  @IsEnum(SaleStatus)
  @IsOptional()
  status?: SaleStatus;
}