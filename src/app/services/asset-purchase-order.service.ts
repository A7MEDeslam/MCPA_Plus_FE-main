import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  AssetPurchaseOrderDetailsDto,
  AssetPurchaseOrderListDto,
  CreateAssetPurchaseOrderDto
} from '../models/asset-procurement.dto';

@Injectable({ providedIn: 'root' })
export class AssetPurchaseOrderService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/AssetPurchaseOrders`;

  today = new Date().toISOString().slice(0, 10);
  POs = signal<AssetPurchaseOrderListDto[]>([]);

  constructor() {
    this.fetchPOs();
  }

  fetchPOs() {
    this.http.get<AssetPurchaseOrderListDto[]>(this.baseUrl).subscribe({
      next: (data) => {
        const pos = data || [];
        this.POs.set([...pos]);

        const openPos = pos.filter(p => p.status === 'Approved' || p.status === 'Partial');
        if (openPos.length === 0) return;

        const requests = openPos.map(po =>
          this.http.get<AssetPurchaseOrderDetailsDto>(`${this.baseUrl}/${po.id}`).pipe(
            catchError(() => of(null))
          )
        );

        forkJoin(requests).subscribe(detailsArray => {
          let changed = false;
          detailsArray.forEach((detail, index) => {
            if (detail?.items?.length) {
              const totalRemaining = detail.items.reduce((sum, item) => {
                const remaining = item.remainingQty ?? (item.orderedQty - (item.receivedQty ?? 0));
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
      error: (err) => console.error('Failed to fetch asset POs:', err)
    });
  }

  getOpen() {
    return this.http.get<AssetPurchaseOrderListDto[]>(`${this.baseUrl}/open`);
  }

  getDetails(id: number) {
    return this.http.get<AssetPurchaseOrderDetailsDto>(`${this.baseUrl}/${id}`);
  }

  addPO(form: {
    supplier: string;
    date: string;
    delivery: string;
    notes: string;
    items: { assetId: string; qty: number | null; price: number | null }[];
  }) {
    const payload: CreateAssetPurchaseOrderDto = {
      supplierId: Number(form.supplier),
      orderDate: form.date,
      deliveryDate: form.delivery || null,
      notes: form.notes || '',
      items: form.items.map(item => ({
        assetId: Number(item.assetId),
        orderedQty: Number(item.qty),
        unitPrice: Number(item.price ?? 0)
      }))
    };

    return this.http.post(this.baseUrl, payload);
  }

  approvePO(id: number) {
    return this.http.post(`${this.baseUrl}/${id}/approve`, {});
  }
}
