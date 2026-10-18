import { TestBed } from '@angular/core/testing';

import { CustomerPocPilotService } from './customer-poc-pilot.service';

describe('CustomerPocPilotService', () => {
  let service: CustomerPocPilotService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomerPocPilotService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
