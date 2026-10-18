import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateBalanceInitializeDto,
  ApproveBalanceInitializeDto,
  BalanceInitializeResponseDto
} from '../models/master-data.dto';

@Injectable({ providedIn: 'root' })
export class BalanceInitializeService {
  private http = inject(HttpClient);

  BALANCE_INITIALIZATIONS = signal<BalanceInitializeResponseDto[]>([]);

  private url = environment.apiUrl + '/balance-initialize';

  constructor() {
    this.fetchAll();
  }

  fetchAll() {
    this.http.get<BalanceInitializeResponseDto[]>(this.url).subscribe({
      next: (data) => this.BALANCE_INITIALIZATIONS.set(data ?? []),
      error: (err) => console.error('Failed to fetch balance initializations:', err)
    });
  }

  create(payload: CreateBalanceInitializeDto) {
    return this.http.post<BalanceInitializeResponseDto>(this.url, payload).pipe(
      tap(() => this.fetchAll())
    );
  }

  approve(id: number, payload: ApproveBalanceInitializeDto) {
    return this.http.put<BalanceInitializeResponseDto>(`${this.url}/${id}/approve`, payload).pipe(
      tap(() => this.fetchAll())
    );
  }

  reject(id: number) {
    return this.http.put<BalanceInitializeResponseDto>(`${this.url}/${id}/reject`, {}).pipe(
      tap(() => this.fetchAll())
    );
  }
}
