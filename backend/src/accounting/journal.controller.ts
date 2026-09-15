import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { JournalService } from './journal.service';
import {
  CreateJournalEntryDto,
  UpdateJournalEntryDto,
} from './dto/create-journal-entry.dto';
import { ListJournalEntriesQueryDto } from './dto/list-journal-entries.query';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Journal')
@Controller('journal')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a draft journal entry (double-entry)' })
  create(@Req() req: Request, @Body() createDto: CreateJournalEntryDto) {
    const { id } = req.user as { id: string };
    return this.journalService.create(createDto, id);
  }

  @Get()
  @ApiOperation({ summary: 'List journal entries with optional filters' })
  findAll(@Query() query: ListJournalEntriesQueryDto) {
    return this.journalService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a journal entry by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.journalService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Edit a draft journal entry (date/concept/reference)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateJournalEntryDto,
  ) {
    return this.journalService.update(id, updateDto);
  }

  @Post(':id/book')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Book (post) a draft journal entry' })
  book(@Param('id', ParseUUIDPipe) id: string) {
    return this.journalService.book(id);
  }

  @Post(':id/cancel')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Cancel a draft journal entry' })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.journalService.cancel(id);
  }
}