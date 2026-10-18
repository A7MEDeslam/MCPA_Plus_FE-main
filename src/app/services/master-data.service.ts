import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateFinishedProductDto,
  CreateRawMaterialDto,
  ProjectMaterialAssignmentDto,
  RawMaterialResponseDto,
  SupplierResponseDto,
  WarehouseResponseDto,
} from '../models/master-data.dto';

@Injectable({ providedIn: 'root' })
export class MasterDataService {
  private http = inject(HttpClient);
  today = new Date().toISOString().slice(0, 10);

  RAW_ITEMS = signal<RawMaterialResponseDto[]>([]);
  RAW_MATERIAL_NAMES = signal<{ id: number; name: string }[]>([]);
  FINISHED_PRODUCT_NAMES = signal<{ id: number; name: string }[]>([]);
  SEMI_ITEMS = signal<any[]>([]); // NEW: semi-finished items, same pattern as RAW_ITEMS
  SUPPLIERS = signal<SupplierResponseDto[]>([]);
  WAREHOUSES = signal<WarehouseResponseDto[]>([]);
  PROJECT_ASSIGNMENTS = signal<ProjectMaterialAssignmentDto[]>([]);
  PRODUCTS = signal<any[]>([]); // already holds finished products — use this for the old-serial picker
  url = environment.apiUrl + '/MasterData';

  constructor() {
    this.fetchRawMaterials();
    this.fetchRawMaterialNames();
    this.fetchSemiFinishedItems();
    this.fetchSuppliers();
    this.fetchWarehouses();
    this.fetchFinishedProducts();
    this.fetchFinishedProductNames();
    this.fetchProjectAssignments();
  }

  fetchWarehouses() {
    this.http.get<WarehouseResponseDto[]>(`${this.url}/warehouses`).subscribe({
      next: (data) => {
        this.WAREHOUSES.set(data ?? []);
      },
      error: (err) => console.error('Failed to fetch warehouses:', err),
    });
  }

  fetchRawMaterials() {
    this.http.get<RawMaterialResponseDto[]>(`${this.url}/raw-materials`).subscribe({
      next: (data) => {
        const items = (data ?? []).map((d: any) => {
          const links = (d.links || [])
            .filter((l: any) => l && l.url)
            .reduce((acc: any[], cur: any) => {
              if (!acc.find((x) => x.url === cur.url))
                acc.push({ id: cur.id, url: cur.url, label: cur.label });
              return acc;
            }, []);

          const suppliers = (d.suppliers || [])
            .filter((s: any) => s && (s.supplierId ?? s.id))
            .reduce((acc: any[], cur: any) => {
              const id = cur.supplierId ?? cur.id;
              if (!acc.find((x) => x.supplierId === id))
                acc.push({
                  supplierId: id,
                  supplierName: cur.supplierName ?? cur.name,
                  isPreferred: !!cur.isPreferred,
                });
              return acc;
            }, []);

          return { ...d, links, suppliers };
        });

        this.RAW_ITEMS.set(items);
      },
      error: (err) => console.error('Failed to fetch raw materials:', err),
    });
  }

  fetchRawMaterialNames() {
    this.http.get<{ id: number; name: string }[]>(`${environment.apiUrl}/RawMaterialNames`).subscribe({
      next: (data) => {
        this.RAW_MATERIAL_NAMES.set((data ?? []).filter((item) => item?.id != null && !!item.name?.trim()));
      },
      error: (err) => console.error('Failed to fetch raw material names:', err),
    });
  }

  addRawMaterialName(name: string) {
    return this.http.post(`${environment.apiUrl}/RawMaterialNames`, { name });
  }

  updateRawMaterialName(id: number, name: string) {
    return this.http.put(`${environment.apiUrl}/RawMaterialNames/${id}`, { name });
  }

  deleteRawMaterialName(id: number) {
    return this.http.delete(`${environment.apiUrl}/RawMaterialNames/${id}`);
  }

  fetchFinishedProductNames() {
    this.http.get<{ id: number; name: string }[]>(`${environment.apiUrl}/FinishedProductNames`).subscribe({
      next: (data) => this.FINISHED_PRODUCT_NAMES.set((data ?? []).filter((item) => item?.id != null && !!item.name?.trim())),
      error: (err) => console.error('Failed to fetch finished product names:', err),
    });
  }

  addFinishedProductName(name: string) {
    return this.http.post(`${environment.apiUrl}/FinishedProductNames`, { name });
  }

  updateFinishedProductName(id: number, name: string) {
    return this.http.put(`${environment.apiUrl}/FinishedProductNames/${id}`, { name });
  }

  deleteFinishedProductName(id: number) {
    return this.http.delete(`${environment.apiUrl}/FinishedProductNames/${id}`);
  }

  // NEW: mirrors fetchRawMaterials(). Adjust the endpoint path below if your API uses a
  // different route (e.g. '/semi-finished-products') — I guessed '/semi-finished-items'.
  fetchSemiFinishedItems() {
    this.http.get<any[]>(`${environment.apiUrl}/SemiFinished`).subscribe({
      next: (data) => this.SEMI_ITEMS.set(data ?? []),
      error: (err) => console.error('Failed to fetch semi-finished items:', err),
    });
  }

  fetchSuppliers() {
    this.http.get<SupplierResponseDto[]>(`${this.url}/suppliers`).subscribe({
      next: (data) => this.SUPPLIERS.set(data ?? []),
      error: (err) => console.error('Failed to fetch suppliers:', err),
    });
  }

  addSupplier(payload: any) {
    this.http.post(`${this.url}/suppliers`, payload).subscribe({
      next: () => this.fetchSuppliers(),
      error: (err) => console.error('Failed to add supplier:', err),
    });
  }
  deleteSupplier(id: number) {
    return this.http.delete(`${this.url}/${id}`).pipe(tap(() => this.fetchSuppliers()));
  }
  addRawMaterial(payload: CreateRawMaterialDto) {
    this.http.post(`${this.url}/raw-materials`, payload).subscribe({
      next: () => this.fetchRawMaterials(),
      error: (err) => console.error('Failed to add raw material:', err),
    });
  }

  createRawMaterial(payload: CreateRawMaterialDto) {
    return this.http.post(`${this.url}/raw-materials`, payload).pipe(tap(() => this.fetchRawMaterials()));
  }

  updateRawMaterial(id: number, payload: Partial<CreateRawMaterialDto>) {
    return this.http.put(`${this.url}/raw-materials/${id}`, payload).pipe(tap(() => this.fetchRawMaterials()));
  }

  updateRawMaterialLinks(id: number, payload: any) {
    console.debug('PUT links payload', id, payload);
    return this.http
      .put(`${this.url}/raw-materials/${id}/links`, payload)
      .pipe(tap((res) => console.debug('PUT links response', id, res)));
  }

  updateRawMaterialSuppliers(id: number, payload: any) {
    console.debug('PUT suppliers payload', id, payload);
    return this.http
      .put(`${this.url}/raw-materials/${id}/suppliers`, payload)
      .pipe(tap((res) => console.debug('PUT suppliers response', id, res)));
  }

  assignMaterialToProject(payload: any) {
    return this.http
      .post(`${this.url}/project-assignments`, payload)
      .pipe(tap(() => this.fetchProjectAssignments()));
  }

  fetchProjectAssignments() {
    this.http.get<ProjectMaterialAssignmentDto[]>(`${this.url}/project-assignments`).subscribe({
      next: (data) => this.PROJECT_ASSIGNMENTS.set(data ?? []),
      error: (err) => console.error('Failed to fetch project assignments:', err),
    });
  }

  fetchFinishedProducts() {
    this.http.get<any[]>(`${this.url}/finished-products`).subscribe({
      next: (data) => {
        this.PRODUCTS.set(
          data.map((d) => ({
            id: d.id,
            code: d.code,
            name: d.name,
            modelType: d.modelType,
            serialPrefix: d.serialPrefix,
            serialStartNumber: d.serialStartNumber ?? 0,
            currentStock: d.currentStock,
            totalProduced: d.totalProduced,
            lastProductionDate: d.lastProductionDate,
          })),
        );
      },
      error: (err) => console.error('Failed to fetch finished products:', err),
    });
  }

  addFinishedProduct(payload: CreateFinishedProductDto) {
    this.http.post(`${this.url}/finished-products`, payload).subscribe({
      next: () => this.fetchFinishedProducts(),
      error: (err) => console.error('Failed to add finished product:', err),
    });
  }

  updateFinishedProduct(id: number, payload: any) {
    return this.http
      .put(`${this.url}/finished-products/${id}`, payload)
      .pipe(tap(() => this.fetchFinishedProducts()));
  }

  deleteFinishedProduct(id: number) {
    return this.http
      .delete(`${this.url}/finished-products/${id}`)
      .pipe(tap(() => this.fetchFinishedProducts()));
  }
}
