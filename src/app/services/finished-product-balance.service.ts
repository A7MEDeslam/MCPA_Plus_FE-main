import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FinishedProductBalance,
  CreateFinishedProductBalance,
  ApproveRejectBalance,
} from '../models/finished-product-balance.dto';

@Injectable({ providedIn: 'root' })
export class FinishedProductBalanceService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/FinishedProductBalanceInitialize`;

  getAll(): Observable<FinishedProductBalance[]> {
    return this.http.get<FinishedProductBalance[]>(this.baseUrl);
  }

  create(payload: CreateFinishedProductBalance): Observable<FinishedProductBalance> {
    return this.http.post<FinishedProductBalance>(this.baseUrl, payload);
  }

  approve(id: number, payload: ApproveRejectBalance): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/approve`, payload);
  }

  reject(id: number, payload: ApproveRejectBalance): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/reject`, payload);
  }
}
