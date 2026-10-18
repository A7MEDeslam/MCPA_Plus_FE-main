import { TestBed } from '@angular/core/testing';

import { Checkbox } from './checkbook';

describe('Checkbox', () => {
  let service: Checkbox;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Checkbox);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
