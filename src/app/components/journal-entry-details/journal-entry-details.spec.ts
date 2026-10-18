import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JournalEntryDetails } from './journal-entry-details';

describe('JournalEntryDetails', () => {
  let component: JournalEntryDetails;
  let fixture: ComponentFixture<JournalEntryDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JournalEntryDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(JournalEntryDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
