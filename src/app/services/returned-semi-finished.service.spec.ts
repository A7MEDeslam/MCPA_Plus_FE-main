import { TestBed } from '@angular/core/testing';

import { ReturnedSemiFinishedService } from './returned-semi-finished.service';

describe('ReturnedSemiFinishedService', () => {
  let service: ReturnedSemiFinishedService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReturnedSemiFinishedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
