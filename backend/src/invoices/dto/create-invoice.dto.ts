import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const SERIE_PATTERN = /^[A-Za-z0-9]{1,3}$/;

export class CreateInvoiceItemDto {
  @ApiProperty({ example: 'Laptop HP 15' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 500.0 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'ITBMS rate (default 0.07 = 7%)', example: 0.07 })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  itbmsRate?: number;
}

export class CreateInvoiceDto {
  @ApiPropertyOptional({ description: 'Invoice serie (Panamá)', example: 'A' })
  @IsString()
  @Matches(SERIE_PATTERN, {
    message: 'serie must be alphanumeric (max 3 chars)',
  })
  @IsOptional()
  serie?: string;

  @ApiPropertyOptional({ example: '2026-09-15' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: 'uuid-del-cliente' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  customerName?: string;

  @ApiPropertyOptional({ description: 'Optional sale that this invoice documents' })
  @IsString()
  @IsOptional()
  saleId?: string;

  @ApiProperty({ type: [CreateInvoiceItemDto], example: [{ description: 'Laptop', quantity: 1, unitPrice: 500 }] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];
}