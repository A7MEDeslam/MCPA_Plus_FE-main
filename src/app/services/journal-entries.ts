import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

import { JournalEntry, CreateJournalEntryDto ,UpdateJournalEntryDto} from '../models/journal-entry.dto';

@Injectable({
  providedIn: 'root',
})
export class JournalEntriesService {
  private http = inject(HttpClient);

  private api = `${environment.apiUrl}/JournalEntries`;

  getAll(): Observable<JournalEntry[]> {
    return this.http.get<JournalEntry[]>(this.api);
  }

  getById(id: number): Observable<JournalEntry> {
    return this.http.get<JournalEntry>(`${this.api}/${id}`);
  }

  create(dto: CreateJournalEntryDto) {
    return this.http.post(this.api, dto);
  }
  update(id: number, dto: UpdateJournalEntryDto) {
    return this.http.put(`${this.api}/${id}`, dto);
  }
  cancel(id: number): Observable<void> {
    return this.http.put<void>(`${this.api}/${id}/cancel`, {});
  }
}
