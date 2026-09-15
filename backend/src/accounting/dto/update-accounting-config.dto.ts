import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAccountingConfigDto {
  @ApiPropertyOptional({ description: 'Ingresos (ventas) account id', example: 'uuid' })
  @IsString()
  @IsOptional()
  salesAccountId?: string;

  @ApiPropertyOptional({ description: 'ITBMS por Pagar account id', example: 'uuid' })
  @IsString()
  @IsOptional()
  itbmsAccountId?: string;

  @ApiPropertyOptional({ description: 'Cuentas por cobrar account id', example: 'uuid' })
  @IsString()
  @IsOptional()
  receivableAccountId?: string;
}