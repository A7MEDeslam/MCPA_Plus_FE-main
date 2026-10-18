import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CheckReportGroup, ChecksReportFilter } from '../models/checks-report.model';

@Injectable({ providedIn: 'root' })
export class ChecksReportService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/CheckRequests`;

  getChecksReport(filter: ChecksReportFilter): Observable<CheckReportGroup[]> {
    let params = new HttpParams();
    if (filter.from) params = params.set('From', filter.from);
    if (filter.to) params = params.set('To', filter.to);
    if (filter.bankAccountId != null) params = params.set('BankAccountId', filter.bankAccountId);
    if (filter.checkNumber) params = params.set('CheckNumber', filter.checkNumber);
    if (filter.status != null) params = params.set('Status', filter.status);

    return this.http.get<CheckReportGroup[]>(`${this.baseUrl}/checks-report`, { params });
  }
}
