import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CostCenter } from '../models/cost-center.dto';

@Injectable({ providedIn: 'root' })
export class CostCenterService {
  private baseUrl = `${environment.apiUrl}/CostCenters`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<CostCenter[]> {
    return this.http.get<CostCenter[]>(this.baseUrl);
  }

  create(payload: { name: string }): Observable<CostCenter> {
    return this.http.post<CostCenter>(this.baseUrl, payload);
  }

  update(id: number, payload: { name: string }): Observable<CostCenter> {
    return this.http.put<CostCenter>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
