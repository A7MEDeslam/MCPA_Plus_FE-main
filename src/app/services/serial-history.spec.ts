import { TestBed } from '@angular/core/testing';

import { SerialHistory } from './serial-history';

describe('SerialHistory', () => {
  let service: SerialHistory;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SerialHistory);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
