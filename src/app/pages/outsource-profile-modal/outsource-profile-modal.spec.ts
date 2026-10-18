import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OutsourceProfileModal } from './outsource-profile-modal';

describe('OutsourceProfileModal', () => {
  let component: OutsourceProfileModal;
  let fixture: ComponentFixture<OutsourceProfileModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OutsourceProfileModal],
    }).compileComponents();

    fixture = TestBed.createComponent(OutsourceProfileModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
