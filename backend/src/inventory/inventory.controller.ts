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
import { InventoryService } from './inventory.service';
import {
  CreateInventoryMovementDto,
  ListInventoryMovementsQueryDto,
} from './dto/create-inventory-movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Register an inventory movement (ENTRY/EXIT/ADJUSTMENT)' })
  create(
    @Body() createInventoryMovementDto: CreateInventoryMovementDto,
    @Req() req: Request,
  ) {
    const { id } = req.user as { id: string };
    return this.inventoryService.create(createInventoryMovementDto, id);
  }

  @Get()
  @ApiOperation({ summary: 'List inventory movements with optional filters' })
  findAll(@Query() query: ListInventoryMovementsQueryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an inventory movement by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findOne(id);
  }
}