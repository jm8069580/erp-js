import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotionService } from './notion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notion')
@Controller('notion')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotionController {
  constructor(private readonly notionService: NotionService) {}

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

  @Get('search')
  @ApiOperation({ summary: 'Search Notion' })
  async search(@Body() body: { query: string }) {
    return this.notionService.search(body.query);
  }
}
