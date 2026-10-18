import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoodsReceiptsReportComponent } from './goods-receipts-report.component';

describe('GoodsReceiptsReportComponent', () => {
  let component: GoodsReceiptsReportComponent;
  let fixture: ComponentFixture<GoodsReceiptsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoodsReceiptsReportComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GoodsReceiptsReportComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
