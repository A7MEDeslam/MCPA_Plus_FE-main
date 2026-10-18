import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  private http = inject(HttpClient);

  today = new Date().toISOString().slice(0, 10);
  POs = signal<any[]>([]);

  constructor() {
    this.fetchPOs();
  }

  fetchPOs() {
    this.http.get<any[]>(`${environment.apiUrl}/PurchaseOrders`).subscribe({
      next: (data) => {
        const pos = data || [];
        this.POs.set([...pos]);

        const openPos = pos.filter((p) => p.status === 'Approved' || p.status === 'Partial');
        if (openPos.length === 0) return;

        const requests = openPos.map((po) =>
          this.http
            .get<any>(`${environment.apiUrl}/PurchaseOrders/${po.id}`)
            .pipe(catchError(() => of(null))),
        );

        forkJoin(requests).subscribe((detailsArray) => {
          let changed = false;
          detailsArray.forEach((detail, index) => {
            if (detail && detail.items && Array.isArray(detail.items) && detail.items.length > 0) {
              const totalRemaining = detail.items.reduce((sum: number, item: any) => {
                const remaining =
                  item.remainingQty ?? (item.orderedQty ?? item.qty ?? 0) - (item.receivedQty ?? 0);
                return sum + Math.max(0, remaining);
              }, 0);

              if (totalRemaining <= 0) {
                openPos[index].status = 'Received';
                changed = true;
              }
            }
          });

          if (changed) {
            this.POs.set([...pos]);
          }
        });
      },

      error: (err) => console.error('Failed to fetch POs:', err),
    });
  }

  addPO(d: any) {
    const payload = {
      supplierId: Number(d.supplier),
      orderDate: d.date,
      deliveryDate: d.delivery || null,
      notes: d.notes || '',
      items: d.items.map((item: any) => ({
        rawMaterialId: Number(item.rawMaterialId),
        orderedQty: Number(item.qty),
        unitPrice: Number(item.price ?? 0),
      })),
    };

    return this.http.post(`${environment.apiUrl}/PurchaseOrders`, payload);
  }

  accountantApprovePO(id: number) {
    return this.http.post(`${environment.apiUrl}/PurchaseOrders/${id}/approve`, {});
  }

  // approvePO(id: number) {
  //   return this.http.post(`${environment.apiUrl}/PurchaseOrders/${id}/approve`, {});
  // }
  approvePO(id: number) {
    return this.http.post(`${environment.apiUrl}/PurchaseOrders/${id}/approve`, {});
  }
  rejectPO(id: number, reason: string = '') {
    return this.http.post(`${environment.apiUrl}/PurchaseOrders/${id}/reject`, { reason });
  }
  updatePO(id: number, d: any) {
    const payload = {
      supplierId: Number(d.supplier),
      orderDate: d.date,
      deliveryDate: d.delivery || null,
      notes: d.notes || '',
      items: d.items.map((item: any) => ({
        rawMaterialId: Number(item.rawMaterialId),
        orderedQty: Number(item.qty),
        unitPrice: Number(item.price ?? 0),
      })),
    };

    return this.http.put(`${environment.apiUrl}/PurchaseOrders/${id}`, payload);
  }
  deletePO(id: number) {
    return this.http.delete(`${environment.apiUrl}/PurchaseOrders/${id}`);
  }
}