import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { BadRequestException, HttpException } from '@nestjs/common';
import { FelService } from './fel.service';
import { PrismaService } from '../prisma/prisma.service';

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQ5OTk5OTk5OTksImlhdCI6MSwiaXNzIjoidGVzdCJ9.abcd';

const cfg = {
  id: 1,
  razonSocial: 'PAC TEST CORP',
  ruc: '155596713-2-2015',
  dv: '59',
  direccion: 'Ave. La Paz',
  codigoUbicacion: '1-1-2',
  provincia: 'PANAMA',
  distrito: 'PANAMA',
  corregimiento: 'SAN FELIPE',
  sucursal: '0000',
  punto: '001',
  pais: 'PA',
};

const invoice: any = {
  id: 'inv-1',
  serie: 'A',
  folio: 1,
  date: new Date('2026-09-15T08:00:00'),
  customerId: 'cust-1',
  customerName: 'Juan Perez',
  subtotal: 100,
  itbms: 7,
  total: 107,
  status: 'DRAFT',
  felStatus: 'NONE',
  customer: {
    name: 'Juan Perez',
    felRuc: '46004-187-302083',
    felDv: '96',
    provincia: 'PANAMA',
    distrito: 'PANAMA',
    corregimiento: 'SAN FELIPE',
    codigoUbicacion: '11-2-1',
    pais: 'PA',
    email: 'juan@mail.com',
    phone: '222-3456',
    address: 'Ave. La Paz',
  },
  items: [
    {
      description: 'Laptop',
      quantity: 1,
      unitPrice: 100,
      itbmsRate: 0.07,
      subtotal: 100,
    },
  ],
};

describe('FelService', () => {
  let service: FelService;
  let http: any;
  let prisma: any;
  let config: any;

  const env = (key: string) => {
    const map: Record<string, string> = {
      FEL_ENABLED: 'true',
      FEL_BASE_URL: 'https://demointegracion.thefactoryhka.com.pa',
      FEL_USERNAME: 'qausertest',
      FEL_PASSWORD: 'qausertest',
    };
    return map[key];
  };

  beforeEach(async () => {
    http = {
      get: jest.fn(),
      post: jest.fn(),
    };
    prisma = {
      invoice: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      felConfig: { findUnique: jest.fn() },
    };
    config = { get: jest.fn().mockImplementation((key: string) => env(key)) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FelService,
        { provide: HttpService, useValue: http },
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(FelService);
  });

  it('exposes enabled flag from env', () => {
    config.get.mockImplementation(() => 'false');
    expect(service.enabled).toBe(false);
    config.get.mockImplementation((key: string) => env(key));
    expect(service.enabled).toBe(true);
  });

  it('logs in and caches the token', async () => {
    http.post.mockReturnValue(of({ data: { token } }));
    const first = await service.login();
    expect(first).toBe(token);
    expect(http.post).toHaveBeenCalledWith(
      'https://demointegracion.thefactoryhka.com.pa/api/autenticacion',
      { usuario: 'qausertest', clave: 'qausertest' },
    );
  });

  it('throws when login response has no token', async () => {
    http.post.mockReturnValue(of({ data: {} }));
    await expect(service.login()).rejects.toThrow(HttpException);
  });

  it('rejects when FEL is not enabled', async () => {
    config.get.mockImplementation(() => 'false');
    await expect(service.foliosRestantes()).rejects.toThrow('not enabled');
  });

  it('returns remaining folios with bearer token', async () => {
    http.post.mockReturnValue(of({ data: { token } }));
    http.get.mockReturnValue(of({ data: { folios: 500 } }));
    const result = await service.foliosRestantes();
    expect(result).toEqual({ folios: 500 });
    expect(http.get).toHaveBeenCalledWith(
      'https://demointegracion.thefactoryhka.com.pa/api/FoliosRestantes',
      { headers: { Authorization: `Bearer ${token}` } },
    );
  });

  it('enviar builds the payload and marks the invoice AUTHORIZED with cufe', async () => {
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    prisma.felConfig.findUnique.mockResolvedValue(cfg);
    http.post
      .mockReturnValueOnce(of({ data: { token } }))
      .mockReturnValueOnce(
        of({ data: { cufe: 'cufe-123', protocolo: 'proto-1', mensaje: 'ok' } }),
      );
    prisma.invoice.update.mockResolvedValue({});

    const result = await service.enviar('inv-1');

    expect(result.accepted).toBe(true);
    expect(result.cufe).toBe('cufe-123');
    const [url, body] = http.post.mock.calls[1];
    expect(url).toContain('/api/Enviar');
    expect(body.documento.codigoSucursalEmisor).toBe('0000');
    expect(body.documento.datosTransaccion.cliente.numeroRUC).toBe(
      '46004-187-302083',
    );
    expect(body.documento.listaItems[0].valorITBMS).toBe(7);
    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: expect.objectContaining({ felStatus: 'AUTHORIZED', cufe: 'cufe-123' }),
    });
  });

  it('enviar marks PENDING_FEL when the PAC rejects', async () => {
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    prisma.felConfig.findUnique.mockResolvedValue(cfg);
    http.post
      .mockReturnValueOnce(of({ data: { token } }))
      .mockReturnValueOnce(of({ data: { codigo: '500', mensaje: 'RUC inválido' } }));
    prisma.invoice.update.mockResolvedValue({});

    const result = await service.enviar('inv-1');

    expect(result.accepted).toBe(false);
    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: expect.objectContaining({
        felStatus: 'PENDING_FEL',
        felMessage: 'RUC inválido',
      }),
    });
  });

  it('enviar requires the FEL config to exist', async () => {
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    prisma.felConfig.findUnique.mockResolvedValue(null);
    await expect(service.enviar('inv-1')).rejects.toThrow(
      new BadRequestException('FEL config is not set; run the seed or configure defaults'),
    );
  });

  it('anular posts the annullment and updates felStatus ANNULLED', async () => {
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    prisma.felConfig.findUnique.mockResolvedValue(cfg);
    http.post
      .mockReturnValueOnce(of({ data: { token } }))
      .mockReturnValueOnce(of({ data: { mensaje: 'Documento anulado' } }));
    prisma.invoice.update.mockResolvedValue({});

    const result = await service.anular('inv-1', 'Prueba de anulación');

    expect(result.accepted).toBe(true);
    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: expect.objectContaining({ felStatus: 'ANNULLED' }),
    });
  });

  it('estado updates the fel message', async () => {
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    prisma.felConfig.findUnique.mockResolvedValue(cfg);
    http.post
      .mockReturnValueOnce(of({ data: { token } }))
      .mockReturnValueOnce(of({ data: { estado: 'AUTORIZADO', mensaje: 'AUTORIZADO' } }));
    prisma.invoice.update.mockResolvedValue({});

    const result = await service.estado('inv-1');

    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: { felMessage: 'AUTORIZADO' },
    });
    expect((result as { estado: string }).estado).toBe('AUTORIZADO');
  });

  it('sincronizarPendientes retries pending invoices', async () => {
    prisma.invoice.findMany.mockResolvedValue([{ id: 'inv-1' }, { id: 'inv-2' }]);
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    prisma.felConfig.findUnique.mockResolvedValue(cfg);
    http.post
      .mockReturnValueOnce(of({ data: { token } }))
      .mockReturnValue(of({ data: { cufe: 'cufe-x' } }));
    prisma.invoice.update.mockResolvedValue({});

    const result = await service.sincronizarPendientes();

    expect(result.procesadas).toBe(2);
    expect(result.autorizadas).toBe(2);
    expect(result.fallos).toEqual([]);
  });

  it('sincronizarPendientes collects failures', async () => {
    prisma.invoice.findMany.mockResolvedValue([{ id: 'inv-1' }]);
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    prisma.felConfig.findUnique.mockResolvedValue(cfg);
    http.post
      .mockReturnValueOnce(of({ data: { token } }))
      .mockReturnValue(throwError(() => new Error('network')));
    prisma.invoice.update.mockResolvedValue({});

    const result = await service.sincronizarPendientes();

    expect(result.procesadas).toBe(1);
    expect(result.autorizadas).toBe(0);
    expect(result.fallos).toEqual(['inv-1']);
  });

  it('throws when invoice does not exist', async () => {
    prisma.invoice.findUnique.mockResolvedValue(null);
    await expect(service.enviar('bad-id')).rejects.toThrow('not found');
  });
});