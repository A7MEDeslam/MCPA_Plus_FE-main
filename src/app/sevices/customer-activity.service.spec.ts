import { TestBed } from '@angular/core/testing';

import { CustomerActivityService } from './customer-activity.service';

describe('CustomerActivityService', () => {
  let service: CustomerActivityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomerActivityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
