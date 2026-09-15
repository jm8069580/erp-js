import { Test } from '@nestjs/testing';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

describe('InvoicesController', () => {
  let controller: InvoicesController;
  let service: any;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      complete: jest.fn(),
      annul: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [{ provide: InvoicesService, useValue: service }],
    }).compile();

    controller = moduleRef.get(InvoicesController);
  });

  it('delegates create with userId', async () => {
    service.create.mockResolvedValue({ id: 'inv-1' });
    await controller.create(
      { user: { id: 'user-1' } } as any,
      { customerName: 'Test', items: [] },
    );
    expect(service.create).toHaveBeenCalledWith(
      { customerName: 'Test', items: [] },
      'user-1',
    );
  });

  it('delegates findAll', async () => {
    service.findAll.mockResolvedValue([]);
    await controller.findAll({});
    expect(service.findAll).toHaveBeenCalled();
  });

  it('delegates findOne', async () => {
    service.findOne.mockResolvedValue({ id: 'inv-1' });
    await controller.findOne('inv-1');
    expect(service.findOne).toHaveBeenCalledWith('inv-1');
  });

  it('delegates complete', async () => {
    service.complete.mockResolvedValue({ id: 'inv-1' });
    await controller.complete({ user: { id: 'user-1' } } as any, 'inv-1');
    expect(service.complete).toHaveBeenCalledWith('inv-1', 'user-1');
  });

  it('delegates annul', async () => {
    service.annul.mockResolvedValue({ id: 'inv-1' });
    await controller.annul({ user: { id: 'user-1' } } as any, 'inv-1');
    expect(service.annul).toHaveBeenCalledWith('inv-1', 'user-1');
  });
});