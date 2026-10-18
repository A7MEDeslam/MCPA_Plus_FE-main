import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChecksReportService } from '../../services/checks-report.service';
import { BankAccountService } from '../../services/bank-accounts';
import { CheckBookService } from '../../services/checkbook';
import {
  CheckReportGroup,
  ChecksReportFilter,
  CheckRequestStatus,
  CheckBook,
} from '../../models/checks-report.model';
import { BankAccount } from '../../models/bank-accounts.dto';
import {
  SearchableSelectComponent,
  SelectOption,
} from '../../components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-checks-report',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchableSelectComponent],
  templateUrl: './checks-report.html',
  styleUrl: './checks-report.css',
})
export class ChecksReportComponent implements OnInit {
  private checksReportService = inject(ChecksReportService);
  private bankAccountService = inject(BankAccountService);
  private checkBooksService = inject(CheckBookService);

  groups = signal<CheckReportGroup[]>([]);
  bankAccounts = signal<BankAccount[]>([]);
  checkBooks = signal<CheckBook[]>([]);
  loading = signal(false);
  error = signal('');

  expandedChecks = signal<Set<string>>(new Set());
  printTarget = signal<string | null>(null);

  statusOptions = [
    { label: 'All', value: undefined },
    { label: 'Pending Approval', value: CheckRequestStatus.PendingApproval },
    { label: 'Approved', value: CheckRequestStatus.Approved },
    { label: 'Rejected', value: CheckRequestStatus.Rejected },
    { label: 'Issued', value: CheckRequestStatus.Issued },
  ];

  filter: ChecksReportFilter = {
    from: '',
    to: '',
    bankAccountId: undefined,
    checkNumber: '',
    status: undefined,
  };

  grandTotal = computed(() => this.groups().reduce((sum, g) => sum + g.totalAmount, 0));

  ngOnInit(): void {
    this.loadBankAccounts();
    this.loadCheckBooks();
    this.loadReport();
  }

  loadBankAccounts(): void {
    this.bankAccountService.getAll().subscribe({
      next: (accounts) => this.bankAccounts.set(accounts),
      error: () => {},
    });
  }

  loadCheckBooks(): void {
    this.checkBooksService.getAll().subscribe({
      next: (books) => this.checkBooks.set(books),
      error: () => {},
    });
  }

  loadReport(): void {
    this.loading.set(true);
    this.error.set('');
    this.checksReportService.getChecksReport(this.filter).subscribe({
      next: (data) => {
        this.groups.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load the report');
        this.loading.set(false);
      },
    });
  }

  resetFilter(): void {
    this.filter = {
      from: '',
      to: '',
      bankAccountId: undefined,
      checkNumber: '',
      status: undefined,
    };
    this.loadReport();
  }

  toggleExpand(checkNumber: string): void {
    this.expandedChecks.update((set) => {
      const next = new Set(set);
      if (next.has(checkNumber)) {
        next.delete(checkNumber);
      } else {
        next.add(checkNumber);
      }
      return next;
    });
  }

  isExpanded(checkNumber: string): boolean {
    return this.expandedChecks().has(checkNumber);
  }

  printOne(checkNumber: string, event: Event): void {
    event.stopPropagation();
    if (!this.isExpanded(checkNumber)) {
      this.expandedChecks.update((set) => new Set(set).add(checkNumber));
    }
    this.printTarget.set(checkNumber);
    setTimeout(() => {
      window.print();
      this.printTarget.set(null);
    });
  }

  printAll(): void {
    this.expandedChecks.set(new Set(this.groups().map((g) => g.checkNumber)));
    this.printTarget.set(null);
    setTimeout(() => window.print());
  }
  bankAccountOptions = computed<SelectOption[]>(() =>
    this.bankAccounts().map((a) => ({ value: a.id, label: a.name })),
  );

  checkNumberOptions = computed<SelectOption[]>(() =>
    this.checkBooks().map((b) => ({ value: b.checkNumber, label: b.checkNumber })),
  );
}
