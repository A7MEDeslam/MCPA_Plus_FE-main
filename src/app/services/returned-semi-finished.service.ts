import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment'; // TODO: fix path to your actual environments file
import {
  ReturnedSemiFinished,
  CreateReturnedSemiFinishedDto,
  ApproveScrapDto,
} from '../models/Returned-semi-finished.dto';

@Injectable({ providedIn: 'root' })
export class ReturnedSemiFinishedService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/ReturnedSemiFinished`;

  getAll(): Observable<ReturnedSemiFinished[]> {
    return this.http.get<ReturnedSemiFinished[]>(this.baseUrl);
  }

  getById(id: number): Observable<ReturnedSemiFinished> {
    return this.http.get<ReturnedSemiFinished>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateReturnedSemiFinishedDto): Observable<ReturnedSemiFinished> {
    return this.http.post<ReturnedSemiFinished>(this.baseUrl, dto);
  }

  approveScrap(id: number, dto: ApproveScrapDto): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/approve-scrap`, dto);
  }
  updateReason(id: number, reason: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/reason`, { reason });
  }
}
