import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface JournalEntrySummary {
  id: number;
  entryNumber: string;
  documentDate: string;
  postingDate: string;
  status: string;
  totalDebit: number;
  totalCredit: number;
  reference: string;
  note: string;
}

export interface GoodsReceiptReportRow {
  id: number;
  grNumber: string;
  receiptDate: string;
  purchaseOrderId: number;
  warehouseId: number;
  warehouseName: string;
  receivedBy: string;
  status: string;
  itemsCount: number;
  totalReceivedQty: number;
  hasJournalEntry: boolean;
  journalEntry: JournalEntrySummary | null;
}

export interface GoodsReceiptsReportFilter {
  from?: string | null;
  to?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class GoodsReceiptsReportService {
  private http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiUrl}/GoodsReceipts/report`;

  getReport(filter: GoodsReceiptsReportFilter = {}): Observable<GoodsReceiptReportRow[]> {
    let params = new HttpParams();

    if (filter.from) {
      params = params.set('from', filter.from);
    }
    if (filter.to) {
      params = params.set('to', filter.to);
    }

    return this.http.get<GoodsReceiptReportRow[]>(this.baseUrl, { params });
  }
}
