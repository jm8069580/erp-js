import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices.query';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create an invoice (DRAFT, Folio auto-generated)' })
  create(@Req() req: Request, @Body() dto: CreateInvoiceDto) {
    const { id } = req.user as { id: string };
    return this.invoicesService.create(dto, id);
  }

  @Get()
  @ApiOperation({ summary: 'List invoices with optional filters' })
  findAll(@Query() query: ListInvoicesQueryDto) {
    return this.invoicesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an invoice by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post(':id/complete')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Complete a draft invoice and generate accounting entry',
  })
  complete(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const { id: userId } = req.user as { id: string };
    return this.invoicesService.complete(id, userId);
  }

  @Post(':id/annul')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Annul a completed invoice with a reversal entry' })
  annul(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const { id: userId } = req.user as { id: string };
    return this.invoicesService.annul(id, userId);
  }
}