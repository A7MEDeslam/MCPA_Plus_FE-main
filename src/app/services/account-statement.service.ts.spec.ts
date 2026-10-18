import { TestBed } from '@angular/core/testing';

import { AccountStatementServiceTs } from './account-statement.service.ts';

describe('AccountStatementServiceTs', () => {
  let service: AccountStatementServiceTs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountStatementServiceTs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
