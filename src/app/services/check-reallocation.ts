import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CheckReallocation, CreateCheckReallocation } from '../models/check-reallocation.dto';

@Injectable({ providedIn: 'root' })
export class CheckReallocationService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}`;

  create(checkRequestId: number, dto: CreateCheckReallocation): Observable<CheckReallocation> {
    return this.http.post<CheckReallocation>(
      `${this.baseUrl}/check-requests/${checkRequestId}/reallocations`,
      dto,
    );
  }

  getForCheck(checkRequestId: number): Observable<CheckReallocation[]> {
    return this.http.get<CheckReallocation[]>(
      `${this.baseUrl}/check-requests/${checkRequestId}/reallocations`,
    );
  }

  getAll(): Observable<CheckReallocation[]> {
    return this.http.get<CheckReallocation[]>(`${this.baseUrl}/check-reallocations`);
  }

  getById(id: number): Observable<CheckReallocation> {
    return this.http.get<CheckReallocation>(`${this.baseUrl}/check-reallocations/${id}`);
  }

  approve(id: number, reason: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/check-reallocations/${id}/approve`, { reason });
  }

  reject(id: number, reason: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/check-reallocations/${id}/reject`, { reason });
  }
}
