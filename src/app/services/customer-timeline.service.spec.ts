import { TestBed } from '@angular/core/testing';

import { CustomerTimelineService } from './customer-timeline.service';

describe('CustomerTimelineService', () => {
  let service: CustomerTimelineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomerTimelineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
