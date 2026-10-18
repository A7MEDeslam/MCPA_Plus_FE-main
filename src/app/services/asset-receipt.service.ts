import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AssetPurchaseOrderService } from './asset-purchase-order.service';
import { AssetReceiptDetailsDto, AssetReceiptListDto, CreateAssetReceiptDto } from '../models/asset-procurement.dto';

@Injectable({ providedIn: 'root' })
export class AssetReceiptService {
  private http = inject(HttpClient);
  private apoService = inject(AssetPurchaseOrderService);
  private baseUrl = `${environment.apiUrl}/AssetReceipts`;

  ARs = signal<AssetReceiptListDto[]>([]);

  constructor() {
    this.fetchARs();
  }

  fetchARs() {
    this.http.get<AssetReceiptListDto[]>(this.baseUrl).subscribe({
      next: (data) => this.ARs.set(data ?? []),
      error: (err) => console.error('Failed to fetch asset receipts:', err)
    });
  }

  getDetails(id: number) {
    return this.http.get<AssetReceiptDetailsDto>(`${this.baseUrl}/${id}`);
  }

  createAR(payload: CreateAssetReceiptDto) {
    return this.http.post(this.baseUrl, payload);
  }

  refreshAll() {
    this.fetchARs();
    this.apoService.fetchPOs();
  }
}
