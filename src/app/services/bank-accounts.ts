import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

import { BankAccount, CreateBankAccountRequest, UpdateBankAccountRequest  , JournalEntryHistoryRow } from '../models/bank-accounts.dto';

@Injectable({
  providedIn: 'root',
})
export class BankAccountService {
  private readonly baseUrl = `${environment.apiUrl}/BankAccounts`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<BankAccount[]> {
    return this.http.get<BankAccount[]>(`${this.baseUrl}/all`);
  }

  getTree(): Observable<BankAccount[]> {
    return this.http.get<BankAccount[]>(`${this.baseUrl}/tree`);
  }

  getById(id: number): Observable<BankAccount> {
    return this.http.get<BankAccount>(`${this.baseUrl}/${id}`);
  }

  getParents(): Observable<BankAccount[]> {
    return this.http.get<BankAccount[]>(`${this.baseUrl}/parents`);
  }

  create(request: CreateBankAccountRequest): Observable<BankAccount> {
    return this.http.post<BankAccount>(`${this.baseUrl}/create`, request);
  }

  update(id: number, request: UpdateBankAccountRequest): Observable<BankAccount> {
    return this.http.put<BankAccount>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
  getAccountHistory(accountId: number): Observable<JournalEntryHistoryRow[]> {
    return this.http.get<JournalEntryHistoryRow[]>(
      `${environment.apiUrl}/JournalEntries/account-history/${accountId}`,
    );
  }



}
