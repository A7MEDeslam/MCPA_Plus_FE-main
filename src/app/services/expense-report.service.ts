import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ExpenseReport,
  CreateExpenseReport,
  UpdateExpenseReport,
  RejectExpenseReport,
  ExpenseCategory,
  ExpenseReportFilters,
} from '../models/expense-report.dto';
@Injectable({
  providedIn: 'root',
})
export class ExpenseReportService {
  private readonly baseUrl = `${environment.apiUrl}/ExpenseReports`;
  private readonly categoriesUrl = `${environment.apiUrl}/ExpenseCategories`;
  constructor(private http: HttpClient) {}
  getAll(filters?: ExpenseReportFilters): Observable<ExpenseReport[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key.charAt(0).toUpperCase() + key.slice(1), value as any);
        }
      });
    }
    return this.http.get<ExpenseReport[]>(this.baseUrl, { params });
  }
  getApproved(): Observable<ExpenseReport[]> {
    return this.http.get<ExpenseReport[]>(`${this.baseUrl}/approved`);
  }
  getById(id: number): Observable<ExpenseReport> {
    return this.http.get<ExpenseReport>(`${this.baseUrl}/${id}`);
  }
  create(request: CreateExpenseReport): Observable<ExpenseReport> {
    return this.http.post<ExpenseReport>(this.baseUrl, request);
  }
  update(id: number, request: UpdateExpenseReport): Observable<ExpenseReport> {
    return this.http.put<ExpenseReport>(`${this.baseUrl}/${id}`, request);
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
  approve(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/approve`, {});
  }
  reject(id: number, request: RejectExpenseReport): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/reject`, request);
  }
  getCategories(): Observable<ExpenseCategory[]> {
    return this.http.get<ExpenseCategory[]>(this.categoriesUrl);
  }
  getCategoryById(id: number): Observable<ExpenseCategory> {
    return this.http.get<ExpenseCategory>(`${this.categoriesUrl}/${id}`);
  }
  createCategory(name: string): Observable<ExpenseCategory> {
    return this.http.post<ExpenseCategory>(this.categoriesUrl, { name });
  }
  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.categoriesUrl}/${id}`);
  }
  getExpensesByAccount(accountId: number): Observable<ExpenseReport[]> {
    return this.http.get<ExpenseReport[]>(`${this.baseUrl}/account/${accountId}/expenses`);
  }
}
