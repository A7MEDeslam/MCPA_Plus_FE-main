import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OutsourceSalesProfile {
  id?: number;
  userId: string;
  userName?: string;
  email?: string;
  companyName: string;
  location: string;
  createdAt?: string;
  createdByUserId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OutsourceSalesProfileService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/outsource-sales-profiles`;

  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  getByUserId(userId: string): Observable<OutsourceSalesProfile> {
    return this.http.get<OutsourceSalesProfile>(
      `${this.API_URL}/by-user/${userId}`,
      this.getAuthHeaders(),
    );
  }

  createProfile(data: {
    userId: string;
    companyName: string;
    location: string;
  }): Observable<OutsourceSalesProfile> {
    return this.http.post<OutsourceSalesProfile>(this.API_URL, data, this.getAuthHeaders());
  }

  updateProfile(
    id: number,
    data: { companyName: string; location: string },
  ): Observable<OutsourceSalesProfile> {
    return this.http.put<OutsourceSalesProfile>(
      `${this.API_URL}/${id}`,
      data,
      this.getAuthHeaders(),
    );
  }
}
