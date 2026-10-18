import { TestBed } from '@angular/core/testing';

import { GoodsReceiptsReportService } from './goods-receipts-report.service';

describe('GoodsReceiptsReportService', () => {
  let service: GoodsReceiptsReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GoodsReceiptsReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
