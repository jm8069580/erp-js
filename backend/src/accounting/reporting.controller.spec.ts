import { Test } from '@nestjs/testing';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';

describe('ReportingController', () => {
  let controller: ReportingController;
  let service: any;

  beforeEach(async () => {
    service = {
      trialBalance: jest.fn(),
      ledger: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ReportingController],
      providers: [{ provide: ReportingService, useValue: service }],
    }).compile();

    controller = moduleRef.get(ReportingController);
  });

  it('delegates trialBalance', async () => {
    service.trialBalance.mockResolvedValue({ totals: { debit: 0, credit: 0 }, accounts: [] });
    await controller.trialBalance(undefined, undefined);
    expect(service.trialBalance).toHaveBeenCalledWith({ dateFrom: undefined, dateTo: undefined });
  });

  it('delegates ledger', async () => {
    service.ledger.mockResolvedValue({ account: { id: 'acc-1' }, movements: [] });
    await controller.ledger('acc-1', '2026-09-01', '2026-09-30');
    expect(service.ledger).toHaveBeenCalledWith('acc-1', {
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
    });
  });
});