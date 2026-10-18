import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SystemNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  workOrderId: number | null;
  isRead: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SystemNotificationsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/notifications`;

  getMine(): Observable<SystemNotification[]> {
    return this.http.get<SystemNotification[]>(`${this.url}/my`);
  }

  markRead(id: number): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}/read`, null);
  }
}
