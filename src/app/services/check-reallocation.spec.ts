import { TestBed } from '@angular/core/testing';

import { CheckReallocation } from './check-reallocation';

describe('CheckReallocation', () => {
  let service: CheckReallocation;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CheckReallocation);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
