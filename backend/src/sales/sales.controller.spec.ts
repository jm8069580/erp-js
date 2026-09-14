import { SalesController } from './sales.controller';

describe('SalesController', () => {
  let controller: SalesController;
  let service: any;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    controller = new SalesController(service);
  });

  it('delegates create with the authenticated user id', () => {
    const dto = { items: [{ productId: 'p-1', quantity: 1 }] } as any;
    controller.create({ user: { id: 'user-1' } } as any, dto);
    expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
  });

  it('delegates findAll', () => {
    controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });

  it('delegates findOne with a parsed id', () => {
    controller.findOne('550e8400-e29b-41d4-a716-446655440000');
    expect(service.findOne).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });

  it('delegates update', () => {
    const dto = { status: 'CANCELLED' } as any;
    controller.update('550e8400-e29b-41d4-a716-446655440000', dto);
    expect(service.update).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      dto,
    );
  });

  it('delegates remove', () => {
    controller.remove('550e8400-e29b-41d4-a716-446655440000');
    expect(service.remove).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });
});