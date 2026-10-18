import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PurchaseOrderService } from './purchase-order.service';
import { MasterDataService } from './master-data.service';

export interface GoodsReceiptItemDetail {
  id: number;
  purchaseOrderItemId: number;
  rawMaterialId: number;
  rawMaterialCode: string;
  rawMaterialName: string;
  unit: string;
  orderedQty: number;
  receivedBeforeThisReceipt: number;
  receivedQty: number;
  receivedAfterThisReceipt: number;
  remainingQtyAfterThisReceipt: number;
  unitPrice: number;
  receivedAmount: number;
  actualUnitPrice: number | null;
}

export interface GoodsReceiptDetail {
  id: number;
  grNumber: string;
  purchaseOrderId: number;
  poNumber: string;
  supplierId: number;
  supplierName: string;
  warehouseId: number;
  warehouseName: string;
  receiptDate: string;
  receivedBy: string;
  status: string;
  itemsCount: number;
  totalReceivedQty: number;
  items: GoodsReceiptItemDetail[];
  journalEntry: any | null;
}

@Injectable({ providedIn: 'root' })
export class GoodsReceiptService {
  private http = inject(HttpClient);
  private poService = inject(PurchaseOrderService);
  private masterData = inject(MasterDataService);

  GRs = signal<any[]>([]);

  constructor() {
    this.fetchGRs();
  }

  fetchGRs() {
    this.http.get<any[]>(`${environment.apiUrl}/GoodsReceipts`).subscribe({
      next: (data) => this.GRs.set(data),
      error: (err) => console.error('Failed to fetch Goods Receipts:', err),
    });
  }

  getById(id: number): Observable<GoodsReceiptDetail> {
    return this.http.get<GoodsReceiptDetail>(`${environment.apiUrl}/GoodsReceipts/${id}`);
  }

  createGR(payload: any) {
    return this.http.post<any>(`${environment.apiUrl}/GoodsReceipts`, payload);
  }

  updateActualPrice(
    goodsReceiptId: number,
    goodsReceiptItemId: number,
    actualUnitPrice: number,
  ): Observable<any> {
    return this.http.put<any>(
      `${environment.apiUrl}/GoodsReceipts/${goodsReceiptId}/actual-prices`,
      {
        items: [{ goodsReceiptItemId, actualUnitPrice }],
      },
    );
  }

  refreshAll() {
    this.fetchGRs();
    this.poService.fetchPOs();
    this.masterData.fetchRawMaterials();
  }
}
