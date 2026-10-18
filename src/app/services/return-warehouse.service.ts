import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CreateReturnedProductDto, ReturnedProductResponseDto, ApproveScrapDto, CreateReturnedProductOldSerialDto } from '../models/return-warehouse.dto';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ReturnWarehouseService {
  private http = inject(HttpClient);
  private readonly url = environment.apiUrl + '/ReturnWarehouse';

  returns = signal<ReturnedProductResponseDto[]>([]);
  pendingApprovals = signal<ReturnedProductResponseDto[]>([]);

  fetchReturns() {
    this.http.get<ReturnedProductResponseDto[]>(this.url).subscribe({
      next: (data) => this.returns.set(data ?? []),
      error: (err) => console.error('Failed to fetch returns:', err),
    });
  }

  fetchPendingApprovals() {
    this.http.get<ReturnedProductResponseDto[]>(`${this.url}/pending-approval`).subscribe({
      next: (data) => this.pendingApprovals.set(data ?? []),
      error: (err) => console.error('Failed to fetch pending approvals:', err),
    });
  }

  getById(id: number): Observable<ReturnedProductResponseDto> {
    return this.http.get<ReturnedProductResponseDto>(`${this.url}/${id}`);
  }

  createReturn(dto: CreateReturnedProductDto): Observable<ReturnedProductResponseDto> {
    return this.http.post<ReturnedProductResponseDto>(this.url, dto).pipe(
      tap(() => {
        this.fetchReturns();
        this.fetchPendingApprovals();
      }),
    );
  }

  approveScrap(id: number, dto: ApproveScrapDto): Observable<ReturnedProductResponseDto> {
    return this.http.put<ReturnedProductResponseDto>(`${this.url}/${id}/approve-scrap`, dto).pipe(
      tap(() => {
        this.fetchReturns();
        this.fetchPendingApprovals();
      }),
    );
  }
  createReturnForOldSerial(dto: CreateReturnedProductOldSerialDto) {
    return this.http.post<ReturnedProductResponseDto>(
      `${environment.apiUrl}/ReturnWarehouse/old-serial`,
      dto,
    );
  }
  updateReason(id: number, reason: string) {
    return this.http
      .put(`${this.url}/${id}/reason`, { reason })
      .pipe(tap(() => this.fetchReturns()));
  }
  returnToWarehouse(dto: {
    serial: string;
    reason: string;
    isGood: boolean;
  }): Observable<ReturnedProductResponseDto> {
    return this.http.post<ReturnedProductResponseDto>(`${this.url}/return-to-warehouse`, dto).pipe(
      tap(() => {
        this.fetchReturns();
      }),
    );
  }
}
