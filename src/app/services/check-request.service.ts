import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  CheckRequest,
  CreateCheckRequest,
  IssueCheckRequest,
  ExpenseReport,
} from '../models/check-request.dto';

@Injectable({
  providedIn: 'root',
})
export class CheckRequestService {
  private readonly baseUrl = `${environment.apiUrl}/CheckRequests`;
  private readonly expenseReportsUrl = `${environment.apiUrl}/ExpenseReports`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<CheckRequest[]> {
    return this.http.get<CheckRequest[]>(this.baseUrl);
  }

  create(request: CreateCheckRequest): Observable<CheckRequest> {
    return this.http.post<CheckRequest>(this.baseUrl, request);
  }

  approve(id: number): Observable<string> {
    return this.http.put(`${this.baseUrl}/${id}/approve`, {}, { responseType: 'text' });
  }
  reject(id: number): Observable<string> {
    return this.http.put(`${this.baseUrl}/${id}/reject`, {}, { responseType: 'text' });
  }

  issue(id: number, request: IssueCheckRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/issue`, request);
  }

  getExpenseReports(params?: {
    categoryId?: number;
    accountId?: number;
    status?: number;
    currency?: string;
    from?: string;
    to?: string;
    search?: string;
  }): Observable<ExpenseReport[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key.charAt(0).toUpperCase() + key.slice(1), value as any);
        }
      });
    }
    return this.http.get<ExpenseReport[]>(this.expenseReportsUrl, { params: httpParams });
  }
  update(id: number, request: CreateCheckRequest): Observable<CheckRequest> {
    return this.http.put<CheckRequest>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
  getExpenses(checkRequestId: number): Observable<ExpenseReport[]> {
    return this.http.get<ExpenseReport[]>(`${this.baseUrl}/${checkRequestId}/expenses`);
  }

  removeExpense(checkRequestId: number, expenseId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${checkRequestId}/expenses/${expenseId}`);
  }
  getCheckBookNumber(checkRequestId: number): Observable<string> {
    return this.http.get(`${this.baseUrl}/${checkRequestId}/check-book-number`, {
      responseType: 'text',
    });
  }
}
