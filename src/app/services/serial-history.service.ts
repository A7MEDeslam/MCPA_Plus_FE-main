import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SerialHistory, SerialHistoryEntry } from '../models/serial-history.dto';

@Injectable({ providedIn: 'root' })
export class SerialHistoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/delivery-requests`;

  getAll(): Observable<SerialHistoryEntry[]> {
    return this.http.get<SerialHistoryEntry[]>(`${this.baseUrl}/history`);
  }

  getBySerial(serialId: number): Observable<SerialHistory> {
    return this.http.get<SerialHistory>(`${this.baseUrl}/${serialId}/history`);
  }
}
