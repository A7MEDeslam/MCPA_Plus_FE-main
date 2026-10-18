import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ExpenseDashboard, ExpenseDashboardFilter } from '../models/expense-dashboard.dto';

@Injectable({ providedIn: 'root' })
export class ExpenseDashboardService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/ExpenseReports/dashboard`;

  getDashboard(filter: ExpenseDashboardFilter): Observable<ExpenseDashboard> {
    let params = new HttpParams();

    if (filter.from) {
      params = params.set('From', filter.from);
    }
    if (filter.to) {
      params = params.set('To', filter.to);
    }
    if (filter.categoryId != null) {
      params = params.set('CategoryId', filter.categoryId);
    }
    if (filter.accountId != null) {
      params = params.set('AccountId', filter.accountId);
    }
    if (filter.employeeId) {
      params = params.set('EmployeeId', filter.employeeId);
    }
    if (filter.status != null) {
      params = params.set('Status', filter.status);
    }

    return this.http.get<ExpenseDashboard>(this.url, { params });
  }
}
