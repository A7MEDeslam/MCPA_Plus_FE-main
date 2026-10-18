import { TestBed } from '@angular/core/testing';

import { BankAccounts } from './bank-accounts';

describe('BankAccounts', () => {
  let service: BankAccounts;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BankAccounts);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
