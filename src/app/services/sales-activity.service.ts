import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateSalesActivityPayload,
  SalesActivity,
  SalesActivityFilters,
  SalesActivityKind,
  UpdateSalesActivityPayload,
} from '../models/sales-activity.models';

@Injectable({ providedIn: 'root' })
export class SalesActivityService {
  private readonly http = inject(HttpClient);

  getAll(kind: SalesActivityKind, filters: SalesActivityFilters = {}): Observable<SalesActivity[]> {
    let params = new HttpParams();
    if (filters.customerId) params = params.set('customerId', filters.customerId);
    if (filters.createdByUserId?.trim()) {
      params = params.set('createdByUserId', filters.createdByUserId.trim());
    }
    return this.http.get<SalesActivity[]>(this.url(kind), { params });
  }

  getById(kind: SalesActivityKind, id: number): Observable<SalesActivity> {
    return this.http.get<SalesActivity>(`${this.url(kind)}/${id}`);
  }

  create(kind: SalesActivityKind, payload: CreateSalesActivityPayload): Observable<SalesActivity> {
    return this.http.post<SalesActivity>(this.url(kind), payload);
  }

  update(
    kind: SalesActivityKind,
    id: number,
    payload: UpdateSalesActivityPayload,
  ): Observable<SalesActivity> {
    return this.http.put<SalesActivity>(`${this.url(kind)}/${id}`, payload);
  }

  delete(kind: SalesActivityKind, id: number): Observable<void> {
    return this.http.delete<void>(`${this.url(kind)}/${id}`);
  }

  private url(kind: SalesActivityKind): string {
    return `${environment.apiUrl}/${kind}-activities`;
  }
}
