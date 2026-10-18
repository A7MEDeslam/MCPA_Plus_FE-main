import { TestBed } from '@angular/core/testing';

import { SemiFinishedService } from './semi-finished.service';

describe('SemiFinishedService', () => {
  let service: SemiFinishedService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SemiFinishedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
