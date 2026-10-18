import { TestBed } from '@angular/core/testing';

import { ChecksReportService } from './checks-report.service';

describe('ChecksReportService', () => {
  let service: ChecksReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChecksReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
