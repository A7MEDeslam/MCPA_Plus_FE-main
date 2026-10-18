import { TestBed } from '@angular/core/testing';

import { SemiFinishedBalanceServiceTs } from './semi-finished-balance.service.ts';

describe('SemiFinishedBalanceServiceTs', () => {
  let service: SemiFinishedBalanceServiceTs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SemiFinishedBalanceServiceTs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
