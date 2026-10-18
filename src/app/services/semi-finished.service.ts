// src/app/services/semi-finished.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
// TODO: adjust this import to match wherever your environment file actually lives
import { environment } from '../../environments/environment';
import {
  SemiFinished,
  SemiFinishedCreate,
  SemiFinishedUpdate,
  ProduceRequest,
  AssignRequest,
  SemiFinishedAssignment,
  Engineer,
} from '../models/Semi-finished.dto';

@Injectable({ providedIn: 'root' })
export class SemiFinishedService {
  private http = inject(HttpClient);
  // If your other services call e.g. `${environment.apiUrl}/Assets`, this follows the same pattern.
  private base = `${environment.apiUrl}/SemiFinished`;

  // GET /api/SemiFinished
  getAll(): Observable<SemiFinished[]> {
    return this.http.get<SemiFinished[]>(this.base);
  }

  // POST /api/SemiFinished
  create(payload: SemiFinishedCreate): Observable<SemiFinished> {
    return this.http.post<SemiFinished>(this.base, payload);
  }

  // PUT /api/SemiFinished/{id}
  update(id: number, payload: SemiFinishedUpdate): Observable<SemiFinished> {
    return this.http.put<SemiFinished>(`${this.base}/${id}`, payload);
  }

  // DELETE /api/SemiFinished/{id}
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // POST /api/SemiFinished/produce
  produce(payload: ProduceRequest): Observable<SemiFinished> {
    return this.http.post<SemiFinished>(`${this.base}/produce`, payload);
  }

  // GET /api/SemiFinished/assignments
  getAssignments(): Observable<SemiFinishedAssignment[]> {
    return this.http.get<SemiFinishedAssignment[]>(`${this.base}/assignments`);
  }

  // POST /api/SemiFinished/assign
  assign(payload: AssignRequest): Observable<SemiFinishedAssignment> {
    return this.http.post<SemiFinishedAssignment>(`${this.base}/assign`, payload);
  }

  // GET /api/SemiFinished/engineers
  getEngineers(): Observable<Engineer[]> {
    return this.http.get<Engineer[]>(`${this.base}/engineers`);
  }
}
