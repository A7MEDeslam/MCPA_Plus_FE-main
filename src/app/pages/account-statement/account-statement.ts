import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BankAccount, BankAccountRow } from '../../models/bank-accounts.dto';
import { BankAccountService } from '../../services/bank-accounts';
import { AccountStatementService } from '../../services/account-statement.service';
import { AccountStatementRow } from '../../models/account-statement.dto';

import { CostCenterService } from '../../services/cost-centers';
import { CostCenter } from '../../models/cost-center.dto';

@Component({
  selector: 'app-account-statement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-statement.html',
  styleUrl: './account-statement.css',
})
export class AccountStatement implements OnInit {
  private bankService = inject(BankAccountService);
  private statementService = inject(AccountStatementService);
  private costCenterService = inject(CostCenterService);

  // Account picker state
  allAccounts = signal<BankAccount[]>([]);
  accountSearchText = signal('');
  selectedAccountIds = signal<Set<number>>(new Set());

  // Cost center picker state
  allCostCenters = signal<CostCenter[]>([]);
  costCenterSearchText = signal('');
  selectedCostCenterIds = signal<Set<number>>(new Set());

  // Date range (optional)
  fromDate = '';
  toDate = '';

  // Report state
  isLoading = signal(false);
  errorMessage = signal('');
  hasRun = signal(false);
  results = signal<AccountStatementRow[]>([]);
  expandedCodes = signal<Set<string>>(new Set());

  filteredAccounts = computed(() => {
    const term = this.accountSearchText().toLowerCase().trim();
    const all = this.allAccounts();
    if (!term) return all;
    return all.filter(
      (a) => a.code.toLowerCase().includes(term) || a.name.toLowerCase().includes(term),
    );
  });

  filteredCostCenters = computed(() => {
    const term = this.costCenterSearchText().toLowerCase().trim();
    const all = this.allCostCenters();
    if (!term) return all;
    return all.filter((c) => c.name.toLowerCase().includes(term));
  });

  selectedCount = computed(() => this.selectedAccountIds().size);
  selectedCostCenterCount = computed(() => this.selectedCostCenterIds().size);

  grandTotalDebit = computed(() =>
    this.results().reduce((sum, r) => sum + this.rowTotalDebit(r), 0),
  );
  grandTotalCredit = computed(() =>
    this.results().reduce((sum, r) => sum + this.rowTotalCredit(r), 0),
  );

  ngOnInit(): void {
    this.bankService.getAll().subscribe({
      next: (data) => this.allAccounts.set(data ?? []),
      error: () => this.errorMessage.set('Unable to load accounts list.'),
    });

    this.costCenterService.getAll().subscribe({
      next: (data) => this.allCostCenters.set(data ?? []),
      error: () => this.errorMessage.set('Unable to load cost centers list.'),
    });
  }

  isSelected(id: number): boolean {
    return this.selectedAccountIds().has(id);
  }

  toggleAccount(id: number): void {
    const next = new Set(this.selectedAccountIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedAccountIds.set(next);
  }

  clearSelection(): void {
    this.selectedAccountIds.set(new Set());
  }

  selectAllVisible(): void {
    const next = new Set(this.selectedAccountIds());
    this.filteredAccounts().forEach((a) => next.add(a.id));
    this.selectedAccountIds.set(next);
  }

  // ---------- Cost center picker ----------

  isCostCenterSelected(id: number): boolean {
    return this.selectedCostCenterIds().has(id);
  }

  toggleCostCenter(id: number): void {
    const next = new Set(this.selectedCostCenterIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedCostCenterIds.set(next);
  }

  clearCostCenterSelection(): void {
    this.selectedCostCenterIds.set(new Set());
  }

  selectAllVisibleCostCenters(): void {
    const next = new Set(this.selectedCostCenterIds());
    this.filteredCostCenters().forEach((c) => next.add(c.id));
    this.selectedCostCenterIds.set(next);
  }

  toggleExpand(code: string): void {
    const next = new Set(this.expandedCodes());
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    this.expandedCodes.set(next);
  }

  isExpanded(code: string): boolean {
    return this.expandedCodes().has(code);
  }

  rowTotalDebit(row: AccountStatementRow): number {
    return row.transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
  }

  rowTotalCredit(row: AccountStatementRow): number {
    return row.transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
  }

  runReport(): void {
    const ids = Array.from(this.selectedAccountIds());
    const costCenterIds = Array.from(this.selectedCostCenterIds());

    if (ids.length === 0) {
      alert('Please select at least one account.');
      return;
    }

    this.errorMessage.set('');
    this.isLoading.set(true);

    const payload: {
      accountIds: number[];
      costCenterIds?: number[];
      from?: string;
      to?: string;
    } = {
      accountIds: ids,
    };

    if (costCenterIds.length > 0) {
      payload.costCenterIds = costCenterIds;
    }

    if (this.fromDate) {
      payload.from = new Date(`${this.fromDate}T00:00:00`).toISOString();
    }
    if (this.toDate) {
      payload.to = new Date(`${this.toDate}T23:59:59.999`).toISOString();
    }

    this.statementService.getStatement(payload).subscribe({
      next: (data) => {
        this.results.set(data ?? []);
        this.expandedCodes.set(
          new Set((data ?? []).filter((r) => r.transactions.length > 0).map((r) => r.accountCode)),
        );
        this.hasRun.set(true);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load account statement.');
        this.isLoading.set(false);
      },
    });
  }

  resetFilters(): void {
    this.fromDate = '';
    this.toDate = '';
    this.clearSelection();
    this.clearCostCenterSelection();
    this.results.set([]);
    this.hasRun.set(false);
  }
  private buildPrintHtml(rows: AccountStatementRow[], title: string): string {
    const rangeText =
      this.fromDate || this.toDate
        ? `${this.fromDate || '—'} to ${this.toDate || '—'}`
        : 'All dates';

    const sections = rows
      .map((row) => {
        const txRows = row.transactions.length
          ? row.transactions
              .map(
                (t) => `
              <tr>
                <td>${this.formatDate(t.date)}</td>
                <td>${t.journalNumber}</td>
                <td>${t.reference || '-'}</td>
                <td>${t.description || '-'}</td>
                <td class="num">${t.debit || 0}</td>
                <td class="num">${t.credit || 0}</td>
                <td class="num">${t.runningBalance}</td>
              </tr>`,
              )
              .join('')
          : `<tr><td colspan="7" class="empty">No transactions in this period.</td></tr>`;

        return `
          <div class="account-block">
            <div class="account-block-header">
              <div>
                <span class="acc-code">${row.accountCode}</span>
                <span class="acc-name">${row.accountName}</span>
              </div>
              <div class="acc-balances">
                <span>Opening: <strong>${row.openingBalance} EGP</strong></span>
                <span>Current: <strong>${row.currentBalance} EGP</strong></span>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Journal #</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th class="num">Debit</th>
                  <th class="num">Credit</th>
                  <th class="num">Balance</th>
                </tr>
              </thead>
              <tbody>${txRows}</tbody>
              ${
                row.transactions.length
                  ? `<tfoot>
                      <tr>
                        <td colspan="4">Totals</td>
                        <td class="num">${this.rowTotalDebit(row)}</td>
                        <td class="num">${this.rowTotalCredit(row)}</td>
                        <td></td>
                      </tr>
                    </tfoot>`
                  : ''
              }
            </table>
          </div>`;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; padding: 32px; }
          .statement-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1f2937; padding-bottom: 12px; margin-bottom: 20px; }
          .statement-header h1 { margin: 0; font-size: 22px; }
          .statement-header .meta { text-align: right; font-size: 13px; color: #4b5563; }
          .account-block { margin-bottom: 28px; page-break-inside: avoid; }
          .account-block-header { display: flex; justify-content: space-between; align-items: center; background: #f3f4f6; padding: 8px 12px; border-radius: 6px 6px 0 0; border: 1px solid #e5e7eb; border-bottom: none; }
          .acc-code { font-weight: 700; margin-right: 8px; }
          .acc-name { color: #374151; }
          .acc-balances { font-size: 13px; display: flex; gap: 16px; color: #374151; }
          table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
          th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
          th { background: #fafafa; font-weight: 600; }
          td.num, th.num { text-align: right; }
          tfoot td { font-weight: 700; background: #f9fafb; }
          .empty { text-align: center; color: #9ca3af; padding: 14px; }
          @media print {
            body { padding: 12px; }
            .account-block { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="statement-header">
          <h1>${title}</h1>
          <div class="meta">
            <div>Period: ${rangeText}</div>
            <div>Generated: ${new Date().toLocaleString()}</div>
          </div>
        </div>
        ${sections}
      </body>
      </html>`;
  }

  private openPrintWindow(html: string): void {
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      alert('Please allow pop-ups to print the report.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  private formatDate(value: string): string {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toISOString().slice(0, 10);
  }

  printSingleReport(row: AccountStatementRow): void {
    const html = this.buildPrintHtml(
      [row],
      `Account Statement - ${row.accountCode} ${row.accountName}`,
    );
    this.openPrintWindow(html);
  }

  printAllReports(): void {
    if (this.results().length === 0) return;
    const html = this.buildPrintHtml(this.results(), 'Account Statement Report');
    this.openPrintWindow(html);
  }
}
