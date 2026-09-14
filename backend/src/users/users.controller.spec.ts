import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let service: any;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    controller = new UsersController(service);
  });

  it('delegates create', () => {
    const dto = { email: 'a@b.c' } as any;
    controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
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
    const dto = { firstName: 'Nuevo' } as any;
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