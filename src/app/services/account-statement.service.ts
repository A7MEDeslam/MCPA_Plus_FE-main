import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { AccountStatementRequest, AccountStatementRow } from '../models/account-statement.dto';

@Injectable({
  providedIn: 'root',
})
export class AccountStatementService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/JournalEntries/account-statement`;

  getStatement(request: AccountStatementRequest): Observable<AccountStatementRow[]> {
    let params = new HttpParams();

    (request.accountIds ?? []).forEach((id) => {
      params = params.append('accountIds', id);
    });

    (request.costCenterIds ?? []).forEach((id) => {
      params = params.append('costCenterIds', id);
    });

    if (request.from) {
      params = params.set('from', request.from);
    }
    if (request.to) {
      params = params.set('to', request.to);
    }

    return this.http.get<AccountStatementRow[]>(this.url, { params });
  }
}
