import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FelService } from './fel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('FEL')
@Controller('fel')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FelController {
  constructor(private readonly felService: FelService) {}

  @Get('folios-restantes')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Consult remaining FEL folios (CAFE)' })
  foliosRestantes() {
    return this.felService.foliosRestantes();
  }

  @Post('estado-documento/:invoiceId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Consult the FEL status of an invoice' })
  estadoDocumento(@Param('invoiceId', ParseUUIDPipe) invoiceId: string) {
    return this.felService.estado(invoiceId);
  }

  @Post('sincronizar')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Retry FEL submission for pending invoices' })
  sincronizar() {
    return this.felService.sincronizarPendientes();
  }

  @Post('anular/:invoiceId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Manually annul an invoice at the PAC' })
  anular(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Body('motivo') motivo: string,
  ) {
    return this.felService.anular(invoiceId, motivo);
  }
}