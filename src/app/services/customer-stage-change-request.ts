import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  StageChangeRequest,
  StageChangeRequestPayload,
  StageChangeRequestRejectPayload,
  StageChangeApprovalPayload,
} from '../models/customer-stage-change-request.dto';

@Injectable({ providedIn: 'root' })
export class CustomerStageChangeRequestService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/customer-stage-change-requests`;

  create(customerId: number, payload: StageChangeRequestPayload): Observable<StageChangeRequest> {
    return this.http.post<StageChangeRequest>(`${this.baseUrl}/customer/${customerId}`, payload);
  }
  approve(requestId: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${requestId}/approve`, null);
  }
  approvePoc(pocId: number, payload: StageChangeApprovalPayload): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${pocId}/approve`, payload);
  }
  reject(requestId: number, payload: StageChangeRequestRejectPayload): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${requestId}/reject`, payload);
  }

  getPendingByCustomer(customerId: number): Observable<StageChangeRequest[]> {
    return this.http.get<StageChangeRequest[]>(`${this.baseUrl}/customer/${customerId}/pending`);
  }

  // TODO: add once confirmed — likely needed:
  // approve(requestId: number): Observable<void>
  // getByCustomer(customerId: number): Observable<StageChangeRequest[]>  (full history, not just pending)
}
