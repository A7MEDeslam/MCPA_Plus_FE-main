import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CustomerContact,
  CustomerContactPayload,
  CustomerContactUpdatePayload,
} from '../models/customer.models';

@Injectable({ providedIn: 'root' })
export class CustomerContactService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/customer-contacts`;

  getByCustomer(customerId: number): Observable<CustomerContact[]> {
    return this.http.get<CustomerContact[]>(`${this.baseUrl}/customer/${customerId}`);
  }

  getById(id: number): Observable<CustomerContact> {
    return this.http.get<CustomerContact>(`${this.baseUrl}/${id}`);
  }

  create(payload: CustomerContactPayload): Observable<CustomerContact> {
    return this.http.post<CustomerContact>(this.baseUrl, this.toFormData(payload));
  }

  update(id: number, payload: CustomerContactUpdatePayload): Observable<CustomerContact> {
    return this.http.put<CustomerContact>(`${this.baseUrl}/${id}`, this.toFormData(payload));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  setPrimary(id: number): Observable<CustomerContact> {
    return this.http.patch<CustomerContact>(`${this.baseUrl}/${id}/set-primary`, null);
  }

  private toFormData(payload: CustomerContactPayload | CustomerContactUpdatePayload): FormData {
    const formData = new FormData();
    const fields: Record<string, string | number | boolean | File | undefined> = {
      CustomerId: 'customerId' in payload ? payload.customerId : undefined,
      Name: payload.name,
      JobTitle: payload.jobTitle,
      Department: payload.department,
      PhoneNumber: payload.phoneNumber,
      AlternativePhoneNumber: payload.alternativePhoneNumber,
      Email: payload.email,
      IsPrimary: payload.isPrimary,
      DealRole: payload.dealRole,
      Influence: payload.influence,
      BusinessCard: payload.businessCard,
      Notes: payload.notes,
    };
    for (const [key, value] of Object.entries(fields)) {
      if (value == null || value === '') continue;
      formData.append(key, value instanceof File ? value : String(value));
    }
    return formData;
  }
}
