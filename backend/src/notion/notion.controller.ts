import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotionService } from './notion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notion')
@Controller('notion')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotionController {
  constructor(private readonly notionService: NotionService) {}

  @Get('config')
  @ApiOperation({ summary: 'Check if Notion is configured' })
  isConfigured() {
    return { configured: this.notionService.isConfigured() };
  }

  @Get('page/:id')
  @ApiOperation({ summary: 'Get Notion page' })
  async getPage(@Param('id') id: string) {
    return this.notionService.getPage(id);
  }

  @Get('blocks/:id')
  @ApiOperation({ summary: 'Get Notion blocks' })
  async getBlocks(@Param('id') id: string) {
    return this.notionService.getBlocks(id);
  }

  @Post('page')
  @ApiOperation({ summary: 'Create Notion page' })
  async createPage(
    @Body() body: { parentPageId: string; title: string; icon?: string },
  ) {
    return this.notionService.createPage(
      body.parentPageId,
      body.title,
      body.icon,
    );
  }

  @Post('blocks/:id')
  @ApiOperation({ summary: 'Append blocks to a Notion page' })
  async appendBlocks(@Param('id') id: string, @Body() body: { blocks: any[] }) {
    return this.notionService.appendBlocks(id, body.blocks);
  }

  @Post('docs')
  @ApiOperation({ summary: 'Generate and publish ERP documentation to Notion' })
  async syncDocumentation(@Body() body: { parentPageId?: string }) {
    return this.notionService.syncDocumentation(body.parentPageId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search Notion' })
  async search(@Query('query') query: string) {
    return this.notionService.search(query);
  }
}