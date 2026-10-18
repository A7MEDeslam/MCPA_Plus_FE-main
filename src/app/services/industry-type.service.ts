import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IndustryType, IndustryTypePayload } from '../models/customer.models';

@Injectable({ providedIn: 'root' })
export class IndustryTypeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/industry-types`;

  getAll(): Observable<IndustryType[]> {
    return this.http.get<IndustryType[]>(this.baseUrl);
  }

  getById(id: number): Observable<IndustryType> {
    return this.http.get<IndustryType>(`${this.baseUrl}/${id}`);
  }

  create(payload: IndustryTypePayload): Observable<IndustryType> {
    return this.http.post<IndustryType>(this.baseUrl, payload);
  }

  update(id: number, payload: IndustryTypePayload): Observable<IndustryType> {
    return this.http.put<IndustryType>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
