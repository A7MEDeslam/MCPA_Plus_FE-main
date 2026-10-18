import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { InventoryService } from './inventory.service';
import { SerialNumberService } from './serial-number.service';
import { MasterDataService } from './master-data.service';

export interface WorkOrderMaterialRequirement {
  rawMaterialId: number;
  rawMaterialName: string;
  unit: string;
  requiredQty: number;
  availableQty: number;
  shortageQty: number;
}

@Injectable({ providedIn: 'root' })
export class WorkOrderService {
  private http = inject(HttpClient);
  private inventory = inject(InventoryService);
  private serials = inject(SerialNumberService);
  private masterData = inject(MasterDataService);
  today = new Date().toISOString().slice(0, 10);
  WorkOrders = signal<any[]>([]);
  ActiveWorkOrders = signal<any[]>([]);

  url = environment.apiUrl + '/WorkOrders';

  constructor() {
    this.fetchWorkOrders();
    this.fetchActiveWorkOrders();
  }

  fetchWorkOrders() {
    this.http.get<any[]>(`${this.url}`).subscribe({
      next: (data) => this.WorkOrders.set(data),
      error: (err) => console.error('Failed to fetch work orders:', err)
    });
  }

  fetchActiveWorkOrders() {
    this.http.get<any[]>(`${this.url}/active`).subscribe({
      next: (data) => this.ActiveWorkOrders.set(data),
      error: (err) => console.error('Failed to fetch active work orders:', err)
    });
  }

  createWorkOrder(payload: any) {
    return this.http.post<any>(`${this.url}`, payload);
  }

  completeWorkOrder(workOrderId: number | string, payload: any) {
    return this.http.post<any>(`${this.url}/${workOrderId}/complete`, payload);
  }

  updateWorkOrder(id: number, payload: any) {
    return this.http.put<any>(`${this.url}/${id}`, payload);
  }

  deleteWorkOrder(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  previewConsumption(workOrderId: number | string, producedQty: number) {
    return this.http.get<any[]>(`${this.url}/${workOrderId}/consumption-preview`, {
      params: { producedQty: String(producedQty) }
    });
  }

  getMaterialRequirements(workOrderId: number | string) {
    return this.http.get<WorkOrderMaterialRequirement[]>(`${this.url}/${workOrderId}/material-requirements`);
  }

  /** Reload all views that depend on a completed work order. */
  refreshAfterCompletion() {
    this.fetchWorkOrders();
    this.fetchActiveWorkOrders();
    this.inventory.fetchRawMaterials();
    this.inventory.fetchFinishedGoods();
    this.inventory.fetchTransactions();
    this.serials.fetchAll();
    this.masterData.fetchRawMaterials();
    this.masterData.fetchFinishedProducts();
  }
}
