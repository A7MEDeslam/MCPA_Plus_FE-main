import { TestBed } from '@angular/core/testing';

import { OutsourceSalesProfileService } from './outsource-sales-profile.service';

describe('OutsourceSalesProfileService', () => {
  let service: OutsourceSalesProfileService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OutsourceSalesProfileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
