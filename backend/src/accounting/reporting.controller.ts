import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportingService, DateRangeQuery } from './reporting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Reporting')
@Controller('reporting')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('trial-balance')
  @ApiOperation({
    summary: 'Trial balance (Balance de Comprobación) of booked entries',
  })
  trialBalance(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reportingService.trialBalance({ dateFrom, dateTo });
  }

  @Get('ledger/:accountId')
  @ApiOperation({ summary: 'Ledger (Libro Mayor) for an account' })
  ledger(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reportingService.ledger(accountId, {
      dateFrom,
      dateTo,
    } as DateRangeQuery);
  }
}