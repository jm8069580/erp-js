import { InventoryController } from './inventory.controller';
import { InventoryMovementType } from '@prisma/client';

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: any;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };
    controller = new InventoryController(service);
  });

  it('delegates create with the authenticated user id', () => {
    const dto = { productId: 'prod-1', type: InventoryMovementType.ENTRY, quantity: 5 } as any;
    const req = { user: { id: 'user-1' } } as any;
    controller.create(dto, req);
    expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
  });

  it('delegates findAll with the parsed query', () => {
    const query = { productId: 'prod-1' } as any;
    controller.findAll(query);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('delegates findOne with a parsed id', () => {
    controller.findOne('550e8400-e29b-41d4-a716-446655440000');
    expect(service.findOne).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });
});