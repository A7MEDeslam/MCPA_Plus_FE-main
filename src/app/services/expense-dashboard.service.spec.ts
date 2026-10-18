import { TestBed } from '@angular/core/testing';

import { ExpenseDashboardService } from './expense-dashboard.service';

describe('ExpenseDashboardService', () => {
  let service: ExpenseDashboardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExpenseDashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
