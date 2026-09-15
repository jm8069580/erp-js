import { Test } from '@nestjs/testing';
import { AccountsController, AccountingConfigController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { Role } from '@prisma/client';

describe('AccountsController', () => {
  let controller: AccountsController;
  let service: any;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [{ provide: AccountsService, useValue: service }],
    }).compile();

    controller = moduleRef.get(AccountsController);
  });

  it('delegates findAll to service', async () => {
    service.findAll.mockResolvedValue([]);
    await controller.findAll(undefined);
    expect(service.findAll).toHaveBeenCalledWith(undefined);
  });

  it('converts isActive string param to boolean', async () => {
    service.findAll.mockResolvedValue([]);
    await controller.findAll('true');
    expect(service.findAll).toHaveBeenCalledWith(true);
  });

  it('delegates create to service', async () => {
    service.create.mockResolvedValue({ id: '1' });
    await controller.create({ code: '1.1.01', name: 'Caja', type: Role.ADMIN as any });
    expect(service.create).toHaveBeenCalled();
  });
});

describe('AccountingConfigController', () => {
  let controller: AccountingConfigController;
  let service: any;

  beforeEach(async () => {
    service = {
      getConfig: jest.fn(),
      updateConfig: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AccountingConfigController],
      providers: [{ provide: AccountsService, useValue: service }],
    }).compile();

    controller = moduleRef.get(AccountingConfigController);
  });

  it('delegates getConfig to service', async () => {
    service.getConfig.mockResolvedValue({ id: 1 });
    await controller.getConfig();
    expect(service.getConfig).toHaveBeenCalled();
  });

  it('delegates updateConfig to service', async () => {
    service.updateConfig.mockResolvedValue({ id: 1 });
    await controller.updateConfig({ salesAccountId: 'a' });
    expect(service.updateConfig).toHaveBeenCalledWith({ salesAccountId: 'a' });
  });
});