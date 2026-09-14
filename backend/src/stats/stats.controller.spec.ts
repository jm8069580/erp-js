import { StatsController } from './stats.controller';

describe('StatsController', () => {
  let controller: StatsController;
  let service: any;

  beforeEach(() => {
    service = { getStats: jest.fn() };
    controller = new StatsController(service);
  });

  it('delegates getStats', () => {
    controller.getStats();
    expect(service.getStats).toHaveBeenCalled();
  });
});