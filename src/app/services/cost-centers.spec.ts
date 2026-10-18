import { TestBed } from '@angular/core/testing';

import { CostCenters } from './cost-centers';

describe('CostCenters', () => {
  let service: CostCenters;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CostCenters);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
