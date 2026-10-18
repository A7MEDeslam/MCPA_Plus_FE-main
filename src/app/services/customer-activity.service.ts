import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CustomerActivity,
  CustomerActivityPayload,
  CustomerActivityUpdatePayload,
} from '../models/customer-activity.dto';

@Injectable({ providedIn: 'root' })
export class CustomerActivityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/customer-activities`;

  getByCustomer(customerId: number): Observable<CustomerActivity[]> {
    return this.http.get<CustomerActivity[]>(`${this.baseUrl}/customer/${customerId}`);
  }

  getById(id: number): Observable<CustomerActivity> {
    return this.http.get<CustomerActivity>(`${this.baseUrl}/${id}`);
  }

  create(payload: CustomerActivityPayload): Observable<CustomerActivity> {
    return this.http.post<CustomerActivity>(this.baseUrl, payload);
  }

  update(id: number, payload: CustomerActivityUpdatePayload): Observable<CustomerActivity> {
    return this.http.put<CustomerActivity>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
