import { Test } from '@nestjs/testing';
import { FelController } from './fel.controller';
import { FelService } from './fel.service';

describe('FelController', () => {
  let controller: FelController;
  let fel: any;

  beforeEach(async () => {
    fel = {
      foliosRestantes: jest.fn(),
      estado: jest.fn(),
      sincronizarPendientes: jest.fn(),
      anular: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [FelController],
      providers: [{ provide: FelService, useValue: fel }],
    }).compile();

    controller = moduleRef.get(FelController);
  });

  it('returns remaining folios', async () => {
    fel.foliosRestantes.mockResolvedValue({ folios: 500 });
    const result = await controller.foliosRestantes();
    expect(result).toEqual({ folios: 500 });
    expect(fel.foliosRestantes).toHaveBeenCalled();
  });

  it('consults an invoice status', async () => {
    fel.estado.mockResolvedValue({ estado: 'AUTORIZADO' });
    const result = await controller.estadoDocumento('inv-1');
    expect(result).toEqual({ estado: 'AUTORIZADO' });
    expect(fel.estado).toHaveBeenCalledWith('inv-1');
  });

  it('synchronizes pending invoices', async () => {
    fel.sincronizarPendientes.mockResolvedValue({ procesadas: 1, autorizadas: 1, fallos: [] });
    const result = await controller.sincronizar();
    expect(result.autorizadas).toBe(1);
  });

  it('manually annuls an invoice with a reason', async () => {
    fel.anular.mockResolvedValue({ accepted: true });
    const result = await controller.anular('inv-1', 'Motivo de prueba');
    expect(result.accepted).toBe(true);
    expect(fel.anular).toHaveBeenCalledWith('inv-1', 'Motivo de prueba');
  });
});