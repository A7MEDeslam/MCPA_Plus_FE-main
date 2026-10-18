import { TestBed } from '@angular/core/testing';

import { CheckRequestService } from './check-request.service';

describe('CheckRequestService', () => {
  let service: CheckRequestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CheckRequestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
