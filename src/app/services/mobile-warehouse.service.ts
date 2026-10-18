import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  MobileWarehouseItemDto,
  MobileWarehouseSerialDto,
  MobileWarehouseHistoryDto,
  AssignItemToMobileWarehouseDto,
  AssignSerialsToMobileWarehouseDto,
  MobileItemActionDto,
  MobileSerialActionDto
} from '../models/mobile-warehouse.dto';

@Injectable({
  providedIn: 'root'
})
export class MobileWarehouseService {
  private http = inject(HttpClient);
  private readonly url = environment.apiUrl + '/MobileWarehouse';

  items = signal<MobileWarehouseItemDto[]>([]);
  serials = signal<MobileWarehouseSerialDto[]>([]);
  history = signal<MobileWarehouseHistoryDto[]>([]);

  fetchHistory(warehouseId: number) {
    if (!warehouseId) return;
    this.http.get<MobileWarehouseHistoryDto[]>(`${this.url}/${warehouseId}/history`).subscribe({
      next: (data) => this.history.set(data ?? []),
      error: (err) => console.error('Failed to fetch mobile warehouse history:', err)
    });
  }

  fetchItems(warehouseId: number) {
    if (!warehouseId) return;
    this.http.get<MobileWarehouseItemDto[]>(`${this.url}/${warehouseId}/items`).subscribe({
      next: (data) => this.items.set(data ?? []),
      error: (err) => console.error('Failed to fetch mobile warehouse items:', err)
    });
  }

  fetchSerials(warehouseId: number) {
    if (!warehouseId) return;
    this.http.get<MobileWarehouseSerialDto[]>(`${this.url}/${warehouseId}/serials`).subscribe({
      next: (data) => this.serials.set(data ?? []),
      error: (err) => console.error('Failed to fetch mobile warehouse serials:', err)
    });
  }

  assignItem(dto: AssignItemToMobileWarehouseDto): Observable<MobileWarehouseItemDto> {
    return this.http.post<MobileWarehouseItemDto>(`${this.url}/assign-item`, dto).pipe(
      tap(() => this.fetchItems(dto.warehouseId))
    );
  }

  assignSerials(dto: AssignSerialsToMobileWarehouseDto): Observable<MobileWarehouseSerialDto[]> {
    return this.http.post<MobileWarehouseSerialDto[]>(`${this.url}/assign-serials`, dto).pipe(
      tap(() => this.fetchSerials(dto.warehouseId))
    );
  }

  actOnItem(dto: MobileItemActionDto): Observable<MobileWarehouseItemDto> {
    return this.http.post<MobileWarehouseItemDto>(`${this.url}/item-action`, dto).pipe(
      tap((res) => this.fetchItems(res.warehouseId))
    );
  }

  actOnSerial(dto: MobileSerialActionDto): Observable<MobileWarehouseSerialDto> {
    return this.http.post<MobileWarehouseSerialDto>(`${this.url}/serial-action`, dto).pipe(
      tap((res) => this.fetchSerials(res.warehouseId))
    );
  }
}
