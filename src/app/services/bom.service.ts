import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BomService {
  private http = inject(HttpClient);
  url = `${environment.apiUrl}/Bom`;
  BomEntries = signal<any[]>([]);

  // --- Finished Product BOM Endpoints ---
  fetchByFinishedProduct(finishedProductId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/product/${finishedProductId}`);
  }

  // باقي الميثودات زي ما هي بدون أي تغيير
  createBomEntry(payload: {
    finishedProductId: number;
    rawMaterialId?: number | null;
    rawMaterialQtyPerUnit?: number | null;
    semiFinishedId?: number | null;
    semiFinishedQtyPerUnit?: number | null;
  }) {
    return this.http.post<any>(`${this.url}`, payload);
  }

  updateBomEntry(
    id: number,
    payload: {
      rawMaterialId: number | null;
      semiFinishedId: number | null;
      qtyPerUnit: number;
    },
  ) {
    return this.http.put<any>(`${this.url}/${id}`, payload);
  }

  deleteBomEntry(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  // --- Semi-Finished BOM Endpoints ---
  fetchSemiFinishedDetails(semiFinishedId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/semi-finished/${semiFinishedId}`);
  }

  createSemiFinishedEntry(payload: {
    semiFinishedId: number;
    rawMaterialId: number;
    qtyPerUnit: number;
  }) {
    return this.http.post<any>(`${this.url}/semi-finished`, payload);
  }

  updateSemiFinishedEntry(id: number, payload: { rawMaterialId: number; qtyPerUnit: number }) {
    return this.http.put<any>(`${this.url}/semi-finished/${id}`, payload);
  }

  deleteSemiFinishedEntry(id: number) {
    return this.http.delete<void>(`${this.url}/semi-finished/${id}`);
  }
}
