import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);
  url = environment.apiUrl + '/Inventory';

  RawMaterials = signal<any[]>([]);
  FinishedGoods = signal<any[]>([]);
  AssetItems = signal<any[]>([]);
  Transactions = signal<any[]>([]);

  constructor() {
    this.fetchRawMaterials();
    this.fetchFinishedGoods();
    this.fetchAssetItems();
    this.fetchTransactions();
  }

  fetchRawMaterials() {
    this.http.get<any[]>(`${this.url}/raw-materials`).subscribe({
      next: (data) => this.RawMaterials.set(data),
      error: (err) => console.error('Failed to fetch raw material stock:', err)
    });
  }

  fetchFinishedGoods() {
    this.http.get<any[]>(`${this.url}/finished-goods`).subscribe({
      next: (data) => this.FinishedGoods.set(data),
      error: (err) => console.error('Failed to fetch finished goods stock:', err)
    });
  }

  fetchTransactions() {
    this.http.get<any[]>(`${this.url}/transactions`).subscribe({
      next: (data) => this.Transactions.set(data),
      error: (err) => console.error('Failed to fetch inventory transactions:', err)
    });
  }

  fetchAssetItems() {
    this.http.get<any[]>(`${this.url}/assets`).subscribe({
      next: (data) => this.AssetItems.set(data ?? []),
      error: (err) => console.error('Failed to fetch asset inventory:', err)
    });
  }
}
