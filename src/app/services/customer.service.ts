import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Customer,
  CustomerAssignPayload,
  CustomerConversionPayload,
  CustomerPayload,
  CustomerProjectConversionResult,
  CustomerUpdatePayload,
  SalesUser,
} from '../models/customer.models';
import { CustomerStageDetails } from '../models/customer-stage-details.dto';
import { CustomerSerial } from '../models/customer-serial.dto';
import { CustomerEngineer } from '../models/customer-engineer.dto';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/customers`;

  getAll(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.baseUrl);
  }

  getById(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.baseUrl}/${id}`);
  }

  getStageDetails(id: number): Observable<CustomerStageDetails> {
    return this.http.get<CustomerStageDetails>(`${this.baseUrl}/${id}/stage-details`);
  }

  getSerials(id: number): Observable<CustomerSerial[]> {
    return this.http.get<CustomerSerial[]>(`${this.baseUrl}/${id}/serials`);
  }

  getEngineers(): Observable<CustomerEngineer[]> {
    return this.http.get<CustomerEngineer[]>(`${this.baseUrl}/engineers`);
  }

  create(payload: CustomerPayload): Observable<Customer> {
    return this.http.post<Customer>(this.baseUrl, payload);
  }

  update(id: number, payload: CustomerUpdatePayload): Observable<Customer> {
    return this.http.put<Customer>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getSalesUsers(): Observable<SalesUser[]> {
    return this.http.get<SalesUser[]>(`${this.baseUrl}/sales-users`);
  }

  assign(id: number, payload: CustomerAssignPayload): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/assign`, payload);
  }

  // TODO: these will change shape once the new conversion endpoints arrive — left as-is for now.
  convertToLead(id: number, payload: CustomerConversionPayload): Observable<Customer> {
    return this.http.patch<Customer>(`${this.baseUrl}/${id}/convert-to-lead`, payload);
  }

  convertToOpportunity(id: number, payload: CustomerConversionPayload): Observable<Customer> {
    return this.http.patch<Customer>(`${this.baseUrl}/${id}/convert-to-opportunity`, payload);
  }

  convertToPoc(id: number): Observable<Customer> {
    return this.http.patch<Customer>(`${this.baseUrl}/${id}/convert-to-poc`, null);
  }

  convertToProject(id: number): Observable<CustomerProjectConversionResult> {
    return this.http.patch<CustomerProjectConversionResult>(
      `${this.baseUrl}/${id}/convert-to-project`,
      null,
    );
  }
}
