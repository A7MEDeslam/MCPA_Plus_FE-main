import { Injectable, signal } from '@angular/core';

const BALANCE_INIT_KEY = 'page_disabled_balance-initialize';
const FG_BALANCE_INIT_KEY = 'page_disabled_fg-balance-initialize';
const SEMI_FINISHED_BALANCE_INIT_KEY = 'page_disabled_semi-finished-balance-initialize';

@Injectable({ providedIn: 'root' })
export class PageToggleService {
  balanceInitDisabled = signal<boolean>(this.readFromStorage(BALANCE_INIT_KEY));
  fgBalanceInitDisabled = signal<boolean>(this.readFromStorage(FG_BALANCE_INIT_KEY));
  semiFinishedBalanceInitDisabled = signal<boolean>(
    this.readFromStorage(SEMI_FINISHED_BALANCE_INIT_KEY),
  );

  toggleBalanceInit() {
    const next = !this.balanceInitDisabled();
    this.balanceInitDisabled.set(next);
    this.writeToStorage(BALANCE_INIT_KEY, next);
  }

  toggleFgBalanceInit() {
    const next = !this.fgBalanceInitDisabled();
    this.fgBalanceInitDisabled.set(next);
    this.writeToStorage(FG_BALANCE_INIT_KEY, next);
  }

  toggleSemiFinishedBalanceInit() {
    const next = !this.semiFinishedBalanceInitDisabled();
    this.semiFinishedBalanceInitDisabled.set(next);
    this.writeToStorage(SEMI_FINISHED_BALANCE_INIT_KEY, next);
  }

  private readFromStorage(key: string): boolean {
    try {
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  }

  private writeToStorage(key: string, value: boolean) {
    try {
      localStorage.setItem(key, String(value));
    } catch {
     
    }
  }
}
