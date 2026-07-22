import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@notionhq/client';

@Injectable()
export class NotionService {
  private readonly logger = new Logger(NotionService.name);
  private readonly client: Client;

  constructor(private configService: ConfigService) {
    this.client = new Client({
      auth: this.configService.get<string>('NOTION_TOKEN'),
    });
  }

  async getPage(pageId: string) {
    try {
      return await this.client.pages.retrieve({ page_id: pageId });
    } catch (error) {
      this.logger.error(`Error getting page: ${error.message}`);
      throw error;
    }
  }

  async getBlocks(blockId: string) {
    try {
      return await this.client.blocks.children.list({
        block_id: blockId,
        page_size: 100,
      });
    } catch (error) {
      this.logger.error(`Error getting blocks: ${error.message}`);
      throw error;
    }
  }

  async createPage(parentPageId: string, title: string, icon?: string) {
    try {
      return await this.client.pages.create({
        parent: { page_id: parentPageId },
        icon: icon ? { type: 'emoji', emoji: icon } : undefined,
        properties: {
          title: {
            title: [{ text: { content: title } }],
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error creating page: ${error.message}`);
      throw error;
    }
  }

  async appendBlocks(blockId: string, blocks: any[]) {
    try {
      return await this.client.blocks.children.append({
        block_id: blockId,
        children: blocks,
      });
    } catch (error) {
      this.logger.error(`Error appending blocks: ${error.message}`);
      throw error;
    }
  }

  async search(query: string) {
    try {
      return await this.client.search({
        query,
        page_size: 10,
      });
    } catch (error) {
      this.logger.error(`Error searching: ${error.message}`);
      throw error;
    }
  }
}
