import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  FelInvoiceWithRelations,
  FEL_TIPO_DOCUMENTO_FACTURA,
  FEL_TIPO_EMISION_NORMAL,
} from './fel.types';
import { buildDocumentPayload } from './fel.payload';
import { decodeJwtExp } from './fel.util';

const TOKEN_REFRESH_MARGIN_SECONDS = 30;

@Injectable()
export class FelService {
  private readonly logger = new Logger(FelService.name);
  private token?: string;
  private tokenExpiresAt = 0;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  get enabled(): boolean {
    return this.config.get<string>('FEL_ENABLED') === 'true';
  }

  private get baseUrl(): string {
    return (
      this.config.get<string>('FEL_BASE_URL') ??
      'https://demointegracion.thefactoryhka.com.pa'
    ).replace(/\/$/, '');
  }

  private get username(): string {
    return this.config.get<string>('FEL_USERNAME') ?? '';
  }

  private get password(): string {
    return this.config.get<string>('FEL_PASSWORD') ?? '';
  }

  private assertEnabled() {
    if (!this.enabled) {
      throw new HttpException(
        'FEL integration is not enabled (FEL_ENABLED=false)',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async login(): Promise<string> {
    try {
      const { data } = await lastValueFrom(
        this.http.post<{ token?: string }>(`${this.baseUrl}/api/autenticacion`, {
          usuario: this.username,
          clave: this.password,
        }),
      );
      if (!data?.token) {
        throw new Error('FEL login response did not include a token');
      }
      return data.token;
    } catch (error) {
      this.logger.error(`FEL login failed: ${(error as Error).message}`);
      throw new HttpException(
        'FEL authentication failed',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private async accessToken(): Promise<string> {
    if (this.tokenExpiresAt > Date.now() / 1000 + TOKEN_REFRESH_MARGIN_SECONDS) {
      return this.token as string;
    }
    const token = await this.login();
    this.token = token;
    const exp = decodeJwtExp(token);
    this.tokenExpiresAt = exp > 0 ? exp : Date.now() / 1000 + 60 * 5;
    return token;
  }

  private bearer() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async foliosRestantes(): Promise<{ folios?: string | number }> {
    this.assertEnabled();
    const token = await this.accessToken();
    const { data } = await lastValueFrom(
      this.http.get(`${this.baseUrl}/api/FoliosRestantes`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    return data as { folios?: string | number };
  }

  async enviar(invoiceId: string) {
    this.assertEnabled();
    const invoice = await this.loadInvoice(invoiceId);
    const cfg = await this.requireConfig();
    const payload = buildDocumentPayload(invoice, cfg);
    const token = await this.accessToken();

    const { data } = await lastValueFrom(
      this.http.post(`${this.baseUrl}/api/Enviar`, { documento: payload }, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    const result = this.parseEnviarResponse(data);
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: result.accepted
        ? {
            felStatus: 'AUTHORIZED',
            cufe: result.cufe ?? null,
            protocolo: result.protocolo ?? null,
            felMessage: result.mensaje ?? null,
            felEnviadoAt: new Date(),
          }
        : { felStatus: 'PENDING_FEL', felMessage: result.mensaje ?? null },
    });
    return result;
  }

  async sincronizarPendientes(): Promise<{
    procesadas: number;
    autorizadas: number;
    fallos: string[];
  }> {
    this.assertEnabled();
    const pendientes = await this.prisma.invoice.findMany({
      where: { felStatus: 'PENDING_FEL' },
      select: { id: true },
    });
    const fallos: string[] = [];
    let autorizadas = 0;
    for (const pending of pendientes) {
      try {
        const result = await this.enviar(pending.id);
        if (result.accepted) autorizadas += 1;
      } catch {
        fallos.push(pending.id);
      }
    }
    return { procesadas: pendientes.length, autorizadas, fallos };
  }

  async anular(
    invoiceId: string,
    motivo: string,
  ): Promise<{ accepted: boolean; mensaje?: string }> {
    this.assertEnabled();
    const invoice = await this.loadInvoice(invoiceId);
    const cfg = await this.requireConfig();
    const token = await this.accessToken();

    const { data } = await lastValueFrom(
      this.http.post(`${this.baseUrl}/api/Anular`, {
        motivoAnulacion: motivo,
        datosDocumento: {
          codigoSucursalEmisor: cfg.sucursal,
          numeroDocumentoFiscal: String(invoice.folio),
          puntoFacturacionFiscal: cfg.punto,
          tipoDocumento: FEL_TIPO_DOCUMENTO_FACTURA,
          tipoEmision: FEL_TIPO_EMISION_NORMAL,
        },
      }, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    const accepted = !this.isErrorCode(data);
    const mensaje = this.extractMessage(data);
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: accepted
        ? {
            felStatus: 'ANNULLED',
            felAnuladoAt: new Date(),
            felMessage: null,
          }
        : {
            felStatus: 'PENDING_FEL',
            felMessage: `Anulación FEL pendiente: ${mensaje}`.slice(0, 500),
          },
    });
    return { accepted, mensaje };
  }

  async estado(invoiceId: string) {
    this.assertEnabled();
    const invoice = await this.loadInvoice(invoiceId);
    const cfg = await this.requireConfig();
    const token = await this.accessToken();

    const { data } = await lastValueFrom(
      this.http.post(`${this.baseUrl}/api/EstadoDocumento`, {
        datosDocumento: {
          codigoSucursalEmisor: cfg.sucursal,
          numeroDocumentoFiscal: String(invoice.folio),
          puntoFacturacionFiscal: cfg.punto,
          tipoDocumento: FEL_TIPO_DOCUMENTO_FACTURA,
          tipoEmision: FEL_TIPO_EMISION_NORMAL,
        },
      }, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    const estado = this.extractMessage(data) || 'PROCESO';
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { felMessage: estado.slice(0, 500) },
    });

    return data;
  }

  private async loadInvoice(invoiceId: string): Promise<FelInvoiceWithRelations> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: { orderBy: { id: 'asc' as const } },
      },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }
    return invoice as unknown as FelInvoiceWithRelations;
  }

  private async requireConfig() {
    const cfg = await this.prisma.felConfig.findUnique({ where: { id: 1 } });
    if (!cfg) {
      throw new HttpException(
        'FEL config is not set; run the seed or configure defaults',
        HttpStatus.BAD_REQUEST,
      );
    }
    return cfg;
  }

  private parseEnviarResponse(data: unknown) {
    const record = (data ?? {}) as Record<string, unknown>;
    const cufe =
      (record.cufe as string) ??
      (record.cufeDocFiscal as string);
    const protocolo = record.protocolo as string;

    if (cufe || protocolo) {
      return { accepted: true, cufe, protocolo, mensaje: this.extractMessage(data) };
    }
    return { accepted: false, mensaje: this.extractMessage(data) };
  }

  private extractMessage(data: unknown): string {
    const record = (data ?? {}) as Record<string, unknown>;
    if (typeof record.mensaje === 'string') return record.mensaje;
    if (typeof record.message === 'string') return record.message;
    if (typeof record.descripcion === 'string') return record.descripcion;
    return '';
  }

  private isErrorCode(data: unknown): boolean {
    const record = (data ?? {}) as Record<string, unknown>;
    if (record.codigo === undefined) return false;
    const codigo = String(record.codigo);
    return codigo.length > 0 && codigo !== '0' && !/^ok$/i.test(codigo);
  }
}