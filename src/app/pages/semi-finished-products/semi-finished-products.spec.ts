import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SemiFinishedProducts } from './semi-finished-products';

describe('SemiFinishedProducts', () => {
  let component: SemiFinishedProducts;
  let fixture: ComponentFixture<SemiFinishedProducts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SemiFinishedProducts],
    }).compileComponents();

    fixture = TestBed.createComponent(SemiFinishedProducts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
