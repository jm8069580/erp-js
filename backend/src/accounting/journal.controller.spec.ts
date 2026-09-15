import { Test } from '@nestjs/testing';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';

describe('JournalController', () => {
  let controller: JournalController;
  let service: any;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      book: jest.fn(),
      cancel: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [JournalController],
      providers: [{ provide: JournalService, useValue: service }],
    }).compile();

    controller = moduleRef.get(JournalController);
  });

  it('delegates create with userId from request', async () => {
    service.create.mockResolvedValue({ id: 'je-1' });
    await controller.create(
      { user: { id: 'user-1' } } as any,
      { concept: 'Test', lines: [] },
    );
    expect(service.create).toHaveBeenCalledWith(
      { concept: 'Test', lines: [] },
      'user-1',
    );
  });

  it('delegates findAll', async () => {
    service.findAll.mockResolvedValue([]);
    await controller.findAll({});
    expect(service.findAll).toHaveBeenCalled();
  });

  it('delegates findOne', async () => {
    service.findOne.mockResolvedValue({ id: 'je-1' });
    await controller.findOne('je-1');
    expect(service.findOne).toHaveBeenCalledWith('je-1');
  });

  it('delegates update', async () => {
    service.update.mockResolvedValue({ id: 'je-1' });
    await controller.update('je-1', { concept: 'X' });
    expect(service.update).toHaveBeenCalledWith('je-1', { concept: 'X' });
  });

  it('delegates book', async () => {
    service.book.mockResolvedValue({ id: 'je-1' });
    await controller.book('je-1');
    expect(service.book).toHaveBeenCalledWith('je-1');
  });

  it('delegates cancel', async () => {
    service.cancel.mockResolvedValue({ id: 'je-1' });
    await controller.cancel('je-1');
    expect(service.cancel).toHaveBeenCalledWith('je-1');
  });
});