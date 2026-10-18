import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JournalEntryTable } from './journal-entry-table';

describe('JournalEntryTable', () => {
  let component: JournalEntryTable;
  let fixture: ComponentFixture<JournalEntryTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JournalEntryTable],
    }).compileComponents();

    fixture = TestBed.createComponent(JournalEntryTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
