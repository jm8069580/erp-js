import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JournalEntryStatus } from '@prisma/client';

export class ListJournalEntriesQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO)' })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date (ISO)' })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filter entries that include this account' })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({ enum: JournalEntryStatus })
  @IsEnum(JournalEntryStatus)
  @IsOptional()
  status?: JournalEntryStatus;
}