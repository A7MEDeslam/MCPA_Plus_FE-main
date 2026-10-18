import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WarehouseDeliveryComponent } from './warehouse-delivery.component';

describe('WarehouseDeliveryComponent', () => {
  let component: WarehouseDeliveryComponent;
  let fixture: ComponentFixture<WarehouseDeliveryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WarehouseDeliveryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WarehouseDeliveryComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
