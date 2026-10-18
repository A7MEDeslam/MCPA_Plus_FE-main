import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { CheckBook, CreateCheckBook } from '../models/checkbook.dto';

@Injectable({
  providedIn: 'root',
})
export class CheckBookService {
  private readonly baseUrl = `${environment.apiUrl}/CheckBooks`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<CheckBook[]> {
    return this.http.get<CheckBook[]>(this.baseUrl);
  }

  create(request: CreateCheckBook): Observable<CheckBook> {
    return this.http.post<CheckBook>(this.baseUrl, request);
  }
}

