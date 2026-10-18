import { TestBed } from '@angular/core/testing';

import { PageToggleServiceTs } from './page-toggle.service.ts';

describe('PageToggleServiceTs', () => {
  let service: PageToggleServiceTs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PageToggleServiceTs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
