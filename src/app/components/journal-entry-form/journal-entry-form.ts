import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { JournalEntriesService } from '../../services/journal-entries';
import { BankAccountService } from '../../services/bank-accounts';
import { BankAccount } from '../../models/bank-accounts.dto';

import { ExpenseReportService } from '../../services/expense-report.service';
import {
  ExpenseReport,
  expenseStatusClass,
  expenseStatusLabel,
} from '../../models/expense-report.dto';
import { JournalEntry } from '../../models/journal-entry.dto';

import { CostCenterService } from '../../services/cost-centers';
import { CostCenter } from '../../models/cost-center.dto';

import { GoodsReceiptService } from '../../services/goods-receipt.service';

@Component({
  selector: 'app-journal-entry-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './journal-entry-form.html',
  styleUrl: './journal-entry-form.css',
})
export class JournalEntryForm implements OnInit, OnChanges {
  @Input() entry: JournalEntry | null = null; // لو موجودة يبقى وضع Edit
  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;
  accounts: BankAccount[] = [];
  costCenters: CostCenter[] = [];

  isSaving = false;

  get isEditMode(): boolean {
    return this.entry != null;
  }

  // Searchable account dropdown state
  openLineIndex: number | null = null;
  accountSearch = '';

  // Searchable expense dropdown state (per line)
  openExpenseLineIndex: number | null = null;
  expenseSearch = '';

  // expenses fetched per line, keyed by line index
  expensesByLine: Record<number, ExpenseReport[]> = {};
  expensesLoadingByLine: Record<number, boolean> = {};

  private readonly SELECTABLE_STATUSES = ['Approved'];

  expenseStatusLabel = expenseStatusLabel;
  expenseStatusClass = expenseStatusClass;

  // number formatter for debit/credit (comma thousand separators, no forced decimals)
  private numberFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  constructor(
    private fb: FormBuilder,
    private service: JournalEntriesService,
    private bankService: BankAccountService,
    private expenseReportsService: ExpenseReportService,
    private costCenterService: CostCenterService,
    private goodsReceiptService: GoodsReceiptService,
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      postingDate: ['', Validators.required],
      documentDate: ['', Validators.required],
      reference: [''],
      note: [''],
      goodsReceiptId: [null],
      lines: this.fb.array([]),
    });

    this.costCenterService.getAll().subscribe({
      next: (res) => {
        this.costCenters = res;
      },
      error: (err) => {
        console.error('Failed to load cost centers:', err);
        this.costCenters = [];
      },
    });

    // Goods Receipts are already loaded/refreshed by the service's own signal (GRs)
    this.goodsReceiptService.fetchGRs();

    this.bankService.getAll().subscribe((res) => {
      this.accounts = res.filter((x) => x.isActive);

      if (this.entry) {
        this.populateFromEntry(this.entry);
      }
    });

    if (this.entry) {
      this.populateFromEntry(this.entry);
    } else {
      setTimeout(() => {
        this.addLine();
        this.addLine();
      });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['entry'] && !changes['entry'].firstChange && this.form) {
      if (this.entry) {
        this.populateFromEntry(this.entry);
      }
    }
  }

  private populateFromEntry(entry: JournalEntry) {
    this.lines.clear();

    this.form.patchValue({
      postingDate: entry.postingDate ? entry.postingDate.slice(0, 10) : '',
      documentDate: entry.documentDate ? entry.documentDate.slice(0, 10) : '',
      reference: entry.reference ?? '',
      note: (entry as any).note ?? '',
      goodsReceiptId: (entry as any).goodsReceiptId ?? null,
    });

    (entry.lines ?? []).forEach((line: any) => {
      // الـ API بيرجع accountCode مش accountId مباشرة، فبنطابقها مع قايمة الحسابات
      const matchedAccount = this.accounts.find(
        (a) => a.id === line.accountId || a.code === line.accountCode,
      );

      this.lines.push(
        this.fb.group({
          accountId: [matchedAccount?.id ?? line.accountId ?? null, Validators.required],
          expenseReportId: [line.expenseReportId ?? null],
          costCenterId: [line.costCenterId ?? null],
          description: [line.description ?? ''],
          debit: [line.debit ?? 0],
          credit: [line.credit ?? 0],
        }),
      );
    });

    const originalLines = entry.lines ?? [];

    this.lines.controls.forEach((lineCtrl, i) => {
      const accountId = lineCtrl.get('accountId')?.value;
      const originalLine = originalLines[i] as any;

      if (accountId) {
        this.loadExpensesForLine(i, accountId, originalLine?.expenseDocumentNumber);
      }
    });
  }

  get lines() {
    return this.form.get('lines') as FormArray;
  }

  createLine() {
    return this.fb.group({
      accountId: [null, Validators.required],
      expenseReportId: [null],
      costCenterId: [null],
      description: [''],
      debit: [0],
      credit: [0],
    });
  }

  addLine() {
    this.lines.push(this.createLine());
  }

  removeLine(i: number) {
    this.lines.removeAt(i);

    if (this.openLineIndex === i) {
      this.closeDropdown();
    }
    if (this.openExpenseLineIndex === i) {
      this.closeExpenseDropdown();
    }

    const reindexed: Record<number, ExpenseReport[]> = {};
    Object.keys(this.expensesByLine)
      .map(Number)
      .forEach((key) => {
        if (key === i) return;
        reindexed[key > i ? key - 1 : key] = this.expensesByLine[key];
      });
    this.expensesByLine = reindexed;
  }

  get totalDebit() {
    return this.lines.controls.reduce((a, b) => a + Number(b.value.debit || 0), 0);
  }

  get totalCredit() {
    return this.lines.controls.reduce((a, b) => a + Number(b.value.credit || 0), 0);
  }

  // ---------- Balance difference (Debit must equal Credit) ----------

  get balanceDifference(): number {
    return Math.abs(this.totalDebit - this.totalCredit);
  }

  get isBalanced(): boolean {
    // guard against floating point rounding issues
    return this.balanceDifference < 0.005;
  }

  get shortSide(): 'debit' | 'credit' | null {
    if (this.isBalanced) return null;
    return this.totalDebit > this.totalCredit ? 'credit' : 'debit';
  }

  get balanceMessage(): string {
    if (this.isBalanced) {
      return 'Balanced';
    }

    const side = this.shortSide === 'credit' ? 'Credit' : 'Debit';
    return `${side} is short by ${this.numberFormatter.format(this.balanceDifference)}`;
  }

  // ---------- Searchable account dropdown ----------

  toggleAccountDropdown(i: number) {
    if (this.openLineIndex === i) {
      this.closeDropdown();
      return;
    }

    this.openLineIndex = i;
    this.accountSearch = '';
  }

  closeDropdown() {
    this.openLineIndex = null;
    this.accountSearch = '';
  }

  filteredAccounts(): BankAccount[] {
    const text = this.accountSearch.trim().toLowerCase();

    if (!text) {
      return this.accounts;
    }

    return this.accounts.filter(
      (a) => a.code?.toLowerCase().includes(text) || a.name?.toLowerCase().includes(text),
    );
  }

  selectAccount(i: number, account: BankAccount | null) {
    this.lines
      .at(i)
      .get('accountId')
      ?.setValue(account ? account.id : null);

    this.lines.at(i).get('expenseReportId')?.setValue(null);
    this.expensesByLine[i] = [];

    this.closeDropdown();

    if (account) {
      this.loadExpensesForLine(i, account.id);
    }
  }

  getAccountLabel(lineIndex: number): string {
    const accountId = this.lines.at(lineIndex).get('accountId')?.value;

    if (!accountId) {
      return 'Select Account';
    }

    const account = this.accounts.find((a) => a.id === accountId);
    return account ? `${account.code} - ${account.name}` : 'Select Account';
  }

  // ---------- Cost Center ----------

  getCostCenterName(id: number | null): string {
    if (!id) return '';
    return this.costCenters.find((c) => c.id === id)?.name ?? '';
  }

  // ---------- Goods Receipt ----------

  goodsReceipts() {
    return this.goodsReceiptService.GRs();
  }

  getGRLabel(gr: any): string {
    return gr.grNumber || gr.documentNumber || gr.number || `GR #${gr.id}`;
  }

  // ---------- Searchable expense dropdown ----------

  private loadExpensesForLine(lineIndex: number, accountId: number, matchDocumentNumber?: string) {
    this.expensesLoadingByLine[lineIndex] = true;

    this.expenseReportsService.getExpensesByAccount(accountId).subscribe({
      next: (res) => {
        const currentExpenseId = this.lines.at(lineIndex)?.get('expenseReportId')?.value;
        let list = res.filter((e) => this.SELECTABLE_STATUSES.includes(e.status));

        if (currentExpenseId && !list.some((e) => e.id === currentExpenseId)) {
          const existing = res.find((e) => e.id === currentExpenseId);
          if (existing) list = [existing, ...list];
        }

        if (matchDocumentNumber && !currentExpenseId) {
          const matched = res.find((e) => e.documentNumber === matchDocumentNumber);
          if (matched) {
            this.lines.at(lineIndex)?.get('expenseReportId')?.setValue(matched.id);
            if (!list.some((e) => e.id === matched.id)) {
              list = [matched, ...list];
            }
          }
        }

        this.expensesByLine[lineIndex] = list;
        this.expensesLoadingByLine[lineIndex] = false;
      },
      error: () => {
        this.expensesByLine[lineIndex] = [];
        this.expensesLoadingByLine[lineIndex] = false;
      },
    });
  }
  toggleExpenseDropdown(i: number) {
    const accountId = this.lines.at(i).get('accountId')?.value;
    if (!accountId) return;

    if (this.openExpenseLineIndex === i) {
      this.closeExpenseDropdown();
      return;
    }

    this.openExpenseLineIndex = i;
    this.expenseSearch = '';
  }

  closeExpenseDropdown() {
    this.openExpenseLineIndex = null;
    this.expenseSearch = '';
  }

  filteredExpenses(lineIndex: number): ExpenseReport[] {
    const list = this.expensesByLine[lineIndex] || [];
    const text = this.expenseSearch.trim().toLowerCase();

    if (!text) {
      return list;
    }

    return list.filter(
      (e) =>
        e.documentNumber?.toLowerCase().includes(text) ||
        e.description?.toLowerCase().includes(text) ||
        e.employeeName?.toLowerCase().includes(text),
    );
  }

  selectExpense(i: number, expense: ExpenseReport | null) {
    const line = this.lines.at(i);

    line.get('expenseReportId')?.setValue(expense ? expense.id : null);

    if (expense) {
      if (!line.get('description')?.value) {
        line.get('description')?.setValue(expense.description ?? '');
      }
      if (expense.amount != null) {
        line.get('debit')?.setValue(expense.amount);
      }
    }

    this.closeExpenseDropdown();
  }

  getExpenseLabel(lineIndex: number): string {
    const accountId = this.lines.at(lineIndex).get('accountId')?.value;
    if (!accountId) {
      return 'Select account first';
    }

    const expenseReportId = this.lines.at(lineIndex).get('expenseReportId')?.value;
    if (!expenseReportId) {
      return 'Select Expense';
    }

    const expense = (this.expensesByLine[lineIndex] || []).find((e) => e.id === expenseReportId);

    if (!expense) return 'Select Expense';

    return expense.documentNumber
      ? `${expense.documentNumber} - ${expense.description ?? ''}`
      : (expense.description ?? `Expense #${expense.id}`);
  }

  // ---------- Debit / Credit: comma formatting + mutual exclusivity ----------

  private parseAmount(raw: string): number {
    const cleaned = raw.replace(/,/g, '').trim();
    if (cleaned === '') return 0;
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  private addCommas(raw: string): string {
    const cleaned = raw.replace(/,/g, '');
    const [intPartRaw, ...rest] = cleaned.split('.');
    const intPart = intPartRaw.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    if (rest.length === 0) {
      return intPart;
    }

    const decPart = rest.join('').replace(/\D/g, '');
    return `${intPart}.${decPart}`;
  }

  formatAmount(value: number | null | undefined): string {
    const num = Number(value || 0);
    if (!num) return '';
    return this.numberFormatter.format(num);
  }

  getDebitDisplay(i: number): string {
    return this.formatAmount(this.lines.at(i).get('debit')?.value);
  }

  getCreditDisplay(i: number): string {
    return this.formatAmount(this.lines.at(i).get('credit')?.value);
  }

  hasDebit(i: number): boolean {
    return Number(this.lines.at(i).value.debit || 0) > 0;
  }

  hasCredit(i: number): boolean {
    return Number(this.lines.at(i).value.credit || 0) > 0;
  }

  onDebitInput(i: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = this.parseAmount(input.value);

    const line = this.lines.at(i);
    line.get('debit')?.setValue(value);

    if (value > 0) {
      line.get('credit')?.setValue(0);
    }

    input.value = this.addCommas(input.value);
  }

  onCreditInput(i: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = this.parseAmount(input.value);

    const line = this.lines.at(i);
    line.get('credit')?.setValue(value);

    if (value > 0) {
      line.get('debit')?.setValue(0);
    }

    input.value = this.addCommas(input.value);
  }

  onDebitBlur(i: number, event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = this.getDebitDisplay(i);
  }

  onCreditBlur(i: number, event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = this.getCreditDisplay(i);
  }

  // ---------- Save (Create or Update) ----------

  save() {
    if (this.isSaving) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      console.warn('Form is invalid:', this.form.errors);
      this.lines.controls.forEach((line, i) => {
        if (line.invalid) {
          console.warn(`Line ${i} invalid:`, line.errors, line.value);
        }
      });
      return;
    }

    if (this.isEditMode && (!this.entry || this.entry.id == null)) {
      console.error('Edit mode but entry.id is missing:', this.entry);
      return;
    }

    this.isSaving = true;

    const payload = this.form.getRawValue();
    console.log('Saving payload:', payload, 'isEditMode:', this.isEditMode, 'entry:', this.entry);

    const request$ =
      this.isEditMode && this.entry
        ? this.service.update(this.entry.id, payload)
        : this.service.create(payload);

    request$.subscribe({
      next: (res) => {
        console.log('Save succeeded:', res);
        this.isSaving = false;
        this.saved.emit();
      },
      error: (err) => {
        console.error('Save failed:', err);
        this.isSaving = false;
      },
    });
  }
}
