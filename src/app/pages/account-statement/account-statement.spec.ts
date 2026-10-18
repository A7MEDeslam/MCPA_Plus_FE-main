import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountStatement } from './account-statement';

describe('AccountStatement', () => {
  let component: AccountStatement;
  let fixture: ComponentFixture<AccountStatement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountStatement],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountStatement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
