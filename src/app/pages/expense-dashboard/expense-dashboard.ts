import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ExpenseDashboardService } from '../../services/expense-dashboard.service';
import {
  ExpenseDashboard,
  ExpenseDashboardFilter,
  ExpenseDashboardCategory,
  ExpenseDashboardAccount,
  ExpenseDashboardStatus,
  ExpenseDashboardRecent,
} from '../../models/expense-dashboard.dto';
import {
  SearchableSelectComponent,
  SelectOption,
} from '../../components/searchable-select/searchable-select.component';

import { BankAccountService } from '../../services/bank-accounts';
import { BankAccount } from '../../models/bank-accounts.dto';

@Component({
  selector: 'app-expense-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchableSelectComponent],
  templateUrl: './expense-dashboard.html',
  styleUrl: './expense-dashboard.css',
})
export class ExpenseDashboardComponent implements OnInit {
  private service = inject(ExpenseDashboardService);
  private bankService = inject(BankAccountService);

  accounts = signal<BankAccount[]>([]);

  // Filters
  fromDate = '';
  toDate = '';
  categoryId: number | null = null;
  accountId: number | null = null;
  employeeId = '';
  status: number | null = null;

  readonly statusOptions = [
    { value: null, label: 'All Statuses' },
    { value: 0, label: 'Pending' },
    { value: 1, label: 'Approved' },
    { value: 2, label: 'AssignedToCheck' },
    { value: 3, label: 'Rejected' },
  ];

  isLoading = signal(false);
  errorMessage = signal('');
  data = signal<ExpenseDashboard | null>(null);

  maxCategoryAmount = computed(() => {
    const cats = this.data()?.byCategory ?? [];
    return cats.reduce((max, c) => Math.max(max, c.totalAmount), 0) || 1;
  });

  maxAccountAmount = computed(() => {
    const accs = this.data()?.byAccount ?? [];
    return accs.reduce((max, a) => Math.max(max, a.totalAmount), 0) || 1;
  });

  ngOnInit(): void {
    this.bankService.getAll().subscribe({
      next: (res) => this.accounts.set(res.filter((a) => a.isActive)),
      error: () => {},
    });

    this.runReport();
  }

  categoryPercent(amount: number): number {
    return (amount / this.maxCategoryAmount()) * 100;
  }

  accountPercent(amount: number): number {
    return (amount / this.maxAccountAmount()) * 100;
  }

  statusClass(status: string): string {
    const key = (status || '').toLowerCase();
    if (key === 'approved') return 'status-approved';
    if (key === 'pending') return 'status-pending';
    if (key === 'assignedtocheck') return 'status-assigned';
    if (key === 'rejected') return 'status-rejected';
    return '';
  }

  runReport(): void {
    this.errorMessage.set('');
    this.isLoading.set(true);

    const filter: ExpenseDashboardFilter = {};

    if (this.fromDate) {
      filter.from = new Date(`${this.fromDate}T00:00:00`).toISOString();
    }
    if (this.toDate) {
      filter.to = new Date(`${this.toDate}T23:59:59.999`).toISOString();
    }
    if (this.categoryId != null) {
      filter.categoryId = this.categoryId;
    }
    if (this.accountId != null) {
      filter.accountId = this.accountId;
    }
    if (this.employeeId.trim()) {
      filter.employeeId = this.employeeId.trim();
    }
    if (this.status != null) {
      filter.status = this.status;
    }

    this.service.getDashboard(filter).subscribe({
      next: (res) => {
        this.data.set(res);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load expenses dashboard.');
        this.isLoading.set(false);
      },
    });
  }

  resetFilters(): void {
    this.fromDate = '';
    this.toDate = '';
    this.categoryId = null;
    this.accountId = null;
    this.employeeId = '';
    this.status = null;
    this.runReport();
  }

  // ---------- Print ----------

  printReport(): void {
    const d = this.data();
    if (!d) return;

    const html = this.buildPrintHtml(d);
    this.openPrintWindow(html);
  }

  private rangeText(): string {
    return this.fromDate || this.toDate
      ? `${this.fromDate || '—'} to ${this.toDate || '—'}`
      : 'All dates';
  }

  private buildCategoryRows(items: ExpenseDashboardCategory[]): string {
    if (!items.length) {
      return `<tr><td colspan="3" class="empty">No category data.</td></tr>`;
    }
    return items
      .map(
        (c) => `
        <tr>
          <td>${c.categoryName}</td>
          <td class="num">${c.count}</td>
          <td class="num">${c.totalAmount}</td>
        </tr>`,
      )
      .join('');
  }

  private buildAccountRows(items: ExpenseDashboardAccount[]): string {
    if (!items.length) {
      return `<tr><td colspan="4" class="empty">No account data.</td></tr>`;
    }
    return items
      .map(
        (a) => `
        <tr>
          <td>${a.accountCode}</td>
          <td>${a.accountName}</td>
          <td class="num">${a.count}</td>
          <td class="num">${a.totalAmount}</td>
        </tr>`,
      )
      .join('');
  }

  private buildStatusRows(items: ExpenseDashboardStatus[]): string {
    if (!items.length) {
      return `<tr><td colspan="3" class="empty">No status data.</td></tr>`;
    }
    return items
      .map(
        (s) => `
        <tr>
          <td>${s.status}</td>
          <td class="num">${s.count}</td>
          <td class="num">${s.totalAmount}</td>
        </tr>`,
      )
      .join('');
  }

  private buildRecentRows(items: ExpenseDashboardRecent[]): string {
    if (!items.length) {
      return `<tr><td colspan="8" class="empty">No recent expenses.</td></tr>`;
    }
    return items
      .map(
        (e) => `
        <tr>
          <td>${e.documentNumber}</td>
          <td>${e.employeeName}</td>
          <td>${this.formatDate(e.date)}</td>
          <td>${e.accountCode}</td>
          <td>${e.categoryName || '-'}</td>
          <td>${e.description || '-'}</td>
          <td class="num">${e.amount} ${e.currency}</td>
          <td>${e.status}</td>
        </tr>`,
      )
      .join('');
  }

  private formatDate(value: string): string {
    const dt = new Date(value);
    return isNaN(dt.getTime()) ? value : dt.toISOString().slice(0, 10);
  }

  private buildPrintHtml(d: ExpenseDashboard): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Expenses Dashboard Report</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; padding: 32px; }
          .statement-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1f2937; padding-bottom: 12px; margin-bottom: 20px; }
          .statement-header h1 { margin: 0; font-size: 22px; }
          .statement-header .meta { text-align: right; font-size: 13px; color: #4b5563; }

          .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 24px; }
          .summary-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
          .summary-box .label { font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
          .summary-box .value { font-size: 16px; font-weight: 700; margin-top: 4px; }

          .section { margin-bottom: 26px; page-break-inside: avoid; }
          .section h2 { font-size: 15px; margin: 0 0 8px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }

          table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
          th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
          th { background: #fafafa; font-weight: 600; }
          td.num, th.num { text-align: right; }
          .empty { text-align: center; color: #9ca3af; padding: 14px; }

          @media print {
            body { padding: 12px; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="statement-header">
          <h1>Expenses Dashboard Report</h1>
          <div class="meta">
            <div>Period: ${this.rangeText()}</div>
            <div>Generated: ${new Date().toLocaleString()}</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-box">
            <div class="label">Total Expenses</div>
            <div class="value">${d.summary.totalExpenses}</div>
          </div>
          <div class="summary-box">
            <div class="label">Approved</div>
            <div class="value">${d.summary.approvedAmount}</div>
          </div>
          <div class="summary-box">
            <div class="label">Pending</div>
            <div class="value">${d.summary.pendingAmount}</div>
          </div>
          <div class="summary-box">
            <div class="label">Assigned To Check</div>
            <div class="value">${d.summary.assignedToCheckAmount}</div>
          </div>
          <div class="summary-box">
            <div class="label">Transactions</div>
            <div class="value">${d.summary.totalTransactions}</div>
          </div>
        </div>

        <div class="section">
          <h2>By Status</h2>
          <table>
            <thead>
              <tr><th>Status</th><th class="num">Count</th><th class="num">Total Amount</th></tr>
            </thead>
            <tbody>${this.buildStatusRows(d.byStatus)}</tbody>
          </table>
        </div>

        <div class="section">
          <h2>By Category</h2>
          <table>
            <thead>
              <tr><th>Category</th><th class="num">Count</th><th class="num">Total Amount</th></tr>
            </thead>
            <tbody>${this.buildCategoryRows(d.byCategory)}</tbody>
          </table>
        </div>

        <div class="section">
          <h2>By Account</h2>
          <table>
            <thead>
              <tr><th>Code</th><th>Name</th><th class="num">Count</th><th class="num">Total Amount</th></tr>
            </thead>
            <tbody>${this.buildAccountRows(d.byAccount)}</tbody>
          </table>
        </div>

        <div class="section">
          <h2>Recent Expenses</h2>
          <table>
            <thead>
              <tr>
                <th>Document #</th>
                <th>Employee</th>
                <th>Date</th>
                <th>Account</th>
                <th>Category</th>
                <th>Description</th>
                <th class="num">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${this.buildRecentRows(d.recentExpenses)}</tbody>
          </table>
        </div>
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
  accountOptions = computed<SelectOption[]>(() =>
    this.accounts().map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` })),
  );
}
