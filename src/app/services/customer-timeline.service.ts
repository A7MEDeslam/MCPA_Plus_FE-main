import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CustomerTimelineEvent } from '../models/customer-timeline.dto';

@Injectable({ providedIn: 'root' })
export class CustomerTimelineService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/customers`;

  getByCustomer(customerId: number): Observable<CustomerTimelineEvent[]> {
    return this.http.get<CustomerTimelineEvent[]>(`${this.baseUrl}/${customerId}/timeline`);
  }
}
