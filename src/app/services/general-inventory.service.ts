import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GeneralInventoryItem {
  id: number;
  code: string;
  name: string;
  category: number;
  categoryName: string;
  unit: string;
  currentStock: number;
  minStockLevel: number;
  isLowStock: boolean;
  description?: string | null;
}

export interface GeneralInventoryName { id: number; name: string; }

export interface GeneralInventoryPayload {
  generalInventoryNameId: number;
  category: number;
  unit: string;
  minStockLevel: number;
  description: string;
}

export interface GeneralInventoryMovement {
  id: number;
  generalInventoryItemId: number;
  type: number;
  typeName: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  notes?: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class GeneralInventoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/GeneralInventory`;
  private readonly namesUrl = `${environment.apiUrl}/GeneralInventoryNames`;

  getAll(): Observable<GeneralInventoryItem[]> { return this.http.get<GeneralInventoryItem[]>(this.baseUrl); }
  getLowStock(): Observable<GeneralInventoryItem[]> { return this.http.get<GeneralInventoryItem[]>(`${this.baseUrl}/low-stock`); }
  getNames(): Observable<GeneralInventoryName[]> { return this.http.get<GeneralInventoryName[]>(this.namesUrl); }
  create(payload: GeneralInventoryPayload): Observable<GeneralInventoryItem> { return this.http.post<GeneralInventoryItem>(this.baseUrl, payload); }
  update(id: number, payload: GeneralInventoryPayload): Observable<GeneralInventoryItem> { return this.http.put<GeneralInventoryItem>(`${this.baseUrl}/${id}`, payload); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/${id}`); }
  receive(id: number, payload: { quantity: number; notes: string }): Observable<unknown> { return this.http.post(`${this.baseUrl}/${id}/receive`, payload); }
  issue(id: number, payload: { quantity: number; notes: string }): Observable<unknown> { return this.http.post(`${this.baseUrl}/${id}/issue`, payload); }
  getHistory(id: number): Observable<GeneralInventoryMovement[]> { return this.http.get<GeneralInventoryMovement[]>(`${this.baseUrl}/${id}/history`); }
  createName(name: string): Observable<GeneralInventoryName> { return this.http.post<GeneralInventoryName>(this.namesUrl, { name }); }
}
