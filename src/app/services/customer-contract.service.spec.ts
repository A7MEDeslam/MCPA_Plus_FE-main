import { TestBed } from '@angular/core/testing';

import { CustomerContractService } from './customer-contract.service';

describe('CustomerContractService', () => {
  let service: CustomerContractService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomerContractService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
