import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CustomerPocPilot, CustomerPocPilotPayload } from '../models/customer-poc-pilot.dto';

@Injectable({ providedIn: 'root' })
export class CustomerPocPilotService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/customer-poc-pilots`;

  getByCustomer(customerId: number): Observable<CustomerPocPilot[]> {
    return this.http.get<CustomerPocPilot[]>(`${this.baseUrl}/customer/${customerId}`);
  }

  create(customerId: number, payload: CustomerPocPilotPayload): Observable<CustomerPocPilot> {
    return this.http.post<CustomerPocPilot>(`${this.baseUrl}/customer/${customerId}`, payload);
  }
}
