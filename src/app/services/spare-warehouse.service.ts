import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { SpareReturnDto, SpareReturnResultDto } from '../models/spare-warehouse.dto';

@Injectable({
  providedIn: 'root'
})
export class SpareWarehouseService {
  private http = inject(HttpClient);
  private readonly url = environment.apiUrl + '/SpareWarehouse';

  history = signal<SpareReturnResultDto[]>([]);

  fetchHistory(warehouseId: number) {
    if (!warehouseId) return;
    this.http.get<SpareReturnResultDto[]>(`${this.url}/${warehouseId}/history`).subscribe({
      next: (data) => this.history.set(data ?? []),
      error: (err) => console.error('Failed to fetch spare warehouse history:', err)
    });
  }

  returnSpare(dto: SpareReturnDto): Observable<SpareReturnResultDto> {
    return this.http.post<SpareReturnResultDto>(`${this.url}/return`, dto).pipe(
      tap(() => this.fetchHistory(dto.warehouseId))
    );
  }
}
