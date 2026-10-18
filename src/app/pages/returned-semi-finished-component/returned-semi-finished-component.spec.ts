import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReturnedSemiFinishedComponent } from './returned-semi-finished-component';

describe('ReturnedSemiFinishedComponent', () => {
  let component: ReturnedSemiFinishedComponent;
  let fixture: ComponentFixture<ReturnedSemiFinishedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReturnedSemiFinishedComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReturnedSemiFinishedComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
