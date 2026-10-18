import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckRequests } from './check-requests';

describe('CheckRequests', () => {
  let component: CheckRequests;
  let fixture: ComponentFixture<CheckRequests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckRequests],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckRequests);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
