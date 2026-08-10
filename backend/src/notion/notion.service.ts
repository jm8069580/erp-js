import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@notionhq/client';

@Injectable()
export class NotionService {
  private readonly logger = new Logger(NotionService.name);
  private client?: Client;

  constructor(private configService: ConfigService) {}

  private getClient(): Client {
    if (!this.client) {
      const token = this.configService.get<string>('NOTION_TOKEN');

      if (!token) {
        throw new ServiceUnavailableException(
          'NOTION_TOKEN is not configured',
        );
      }

      this.client = new Client({ auth: token });
    }

    return this.client;
  }

  isConfigured(): boolean {
    return Boolean(this.configService.get<string>('NOTION_TOKEN'));
  }

  async getPage(pageId: string) {
    try {
      return await this.getClient().pages.retrieve({ page_id: pageId });
    } catch (error) {
      this.logger.error(`Error getting page: ${error.message}`);
      throw error;
    }
  }

  async getBlocks(blockId: string) {
    try {
      return await this.getClient().blocks.children.list({
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
      return await this.getClient().pages.create({
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
      return await this.getClient().blocks.children.append({
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
      return await this.getClient().search({
        query,
        page_size: 10,
      });
    } catch (error) {
      this.logger.error(`Error searching: ${error.message}`);
      throw error;
    }
  }

  async syncDocumentation(parentPageId?: string) {
    const pageId =
      parentPageId || this.configService.get<string>('NOTION_DOCS_PAGE_ID');

    if (!pageId) {
      throw new BadRequestException(
        'Provide parentPageId or set NOTION_DOCS_PAGE_ID',
      );
    }

    const page = await this.createPage(pageId, 'ERP-JS Documentation', '📘');
    await this.appendBlocks(page.id, this.buildDocumentationBlocks());
    return page;
  }

  private buildDocumentationBlocks() {
    const richText = (content: string) => ({ type: 'text' as const, text: { content } });
    const heading = (level: number, content: string) => ({
      object: 'block',
      type: `heading_${level}`,
      [`heading_${level}`]: { rich_text: [richText(content)] },
    });
    const bullet = (content: string) => ({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: { rich_text: [richText(content)] },
    });
    const paragraph = (content: string) => ({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [richText(content)] },
    });

    return [
      heading(1, 'ERP-JS'),
      paragraph(
        'Sistema ERP: backend NestJS + Prisma/PostgreSQL y frontend React + Vite. Autenticación JWT con roles (ADMIN, MANAGER, USER).',
      ),
      heading(2, 'Tech Stack'),
      bullet('Backend: NestJS 10, Prisma, PostgreSQL, JWT, Swagger'),
      bullet('Frontend: React 18, Vite, TypeScript, Zustand, Tailwind CSS'),
      heading(2, 'Modules & API (prefix /api/v1)'),
      bullet('Auth: POST /auth/login, GET /auth/profile'),
      bullet('Users: CRUD /users (writes solo ADMIN)'),
      bullet('Products: CRUD /products (writes ADMIN o MANAGER)'),
      bullet('Stats: GET /stats'),
      bullet('Notion: GET /notion/config, page/blocks/search, POST /notion/docs'),
      bullet('Swagger docs: GET /api/docs'),
      heading(2, 'Data Models'),
      bullet(
        'User: id, email, password, firstName, lastName, role, isActive, timestamps',
      ),
      bullet('Product: id, name, description, sku, price, stock, isActive, timestamps'),
      heading(2, 'Setup'),
      bullet('cp .env.example .env y editar DATABASE_URL / JWT_SECRET'),
      bullet('npx prisma db push  (crea las tablas)'),
      bullet('npm run db:seed  (usuario admin)'),
      bullet('npm run start:dev  (backend en :3001)'),
      bullet('En frontend/: npm run dev'),
    ];
  }
}