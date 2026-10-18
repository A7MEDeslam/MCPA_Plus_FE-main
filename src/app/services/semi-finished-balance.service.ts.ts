import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  SemiFinishedBalance,
  CreateSemiFinishedBalance,
  ApproveRejectSemiFinishedBalance,
} from '../models/semi-finished-balance.model';

@Injectable({ providedIn: 'root' })
export class SemiFinishedBalanceService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/SemiFinishedBalanceInitialize`;

  getAll(): Observable<SemiFinishedBalance[]> {
    return this.http.get<SemiFinishedBalance[]>(this.baseUrl);
  }

  create(payload: CreateSemiFinishedBalance): Observable<SemiFinishedBalance> {
    return this.http.post<SemiFinishedBalance>(this.baseUrl, payload);
  }

  approve(id: number, payload: ApproveRejectSemiFinishedBalance): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/approve`, payload);
  }

  reject(id: number, payload: ApproveRejectSemiFinishedBalance): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/reject`, payload);
  }
}
