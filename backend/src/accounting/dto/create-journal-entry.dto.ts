import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJournalEntryLineDto {
  @ApiProperty({ example: 'uuid-de-la-cuenta' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiPropertyOptional({ example: 'Venta al contado' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ example: 100.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  debit?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  credit?: number;
}

export class CreateJournalEntryDto {
  @ApiPropertyOptional({ example: '2026-09-15' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ example: 'Venta a crédito cliente' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  concept: string;

  @ApiPropertyOptional({ example: 'FAC-0001' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  reference?: string;

  @ApiProperty({ type: [CreateJournalEntryLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateJournalEntryLineDto)
  lines: CreateJournalEntryLineDto[];
}

export class UpdateJournalEntryDto {
  @ApiPropertyOptional({ example: '2026-09-15' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: 'Venta a crédito cliente' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsOptional()
  concept?: string;

  @ApiPropertyOptional({ example: 'FAC-0001' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  reference?: string;
}