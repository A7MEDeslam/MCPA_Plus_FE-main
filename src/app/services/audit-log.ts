import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuditLog {
  id: number;
  userId: string;
  userName: string;
  action: 'Create' | 'Update' | 'Delete' | string;
  entityName: string;
  entityId: string;
  description: string;
  ipAddress: string;
  endpoint: string;
  httpMethod: string;
  createdAt: string;
}

export interface AuditLogDetail extends AuditLog {
  oldValues: string | null;
  newValues: string | null;
  changedColumns: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private http = inject(HttpClient);
  // use whatever base URL your other services use, e.g. http://196.219.184.42/ProFlowERP/api
  private baseUrl = `${environment.apiUrl}/audit-logs`;

  getAll(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(this.baseUrl);
  }

  getById(id: number): Observable<AuditLogDetail> {
    return this.http.get<AuditLogDetail>(`${this.baseUrl}/${id}`);
  }
}