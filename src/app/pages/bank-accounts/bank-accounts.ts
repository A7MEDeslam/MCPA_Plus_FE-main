import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';

import {
  AccountType,
  ACCOUNT_TYPE_CLASS,
  ACCOUNT_TYPE_LABELS,
  BankAccount,
  BankAccountRow,
  JournalEntryHistoryRow,
} from '../../models/bank-accounts.dto';

import { BankAccountService } from '../../services/bank-accounts';

type TypeFilter = 'All' | AccountType;

@Component({
  selector: 'app-bank-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './bank-accounts.html',
  styleUrls: ['./bank-accounts.css'],
})
export class BankAccountsComponent implements OnInit {
  constructor(
    private bankService: BankAccountService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.createForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      parentId: [null],
      type: [AccountType.Asset, Validators.required],
    });

    this.editForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      type: [AccountType.Asset, Validators.required],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.loadAll();
  }

  submitting = false;
  deleting = false;
  errorMessage = '';
  searchTerm = '';
  activeFilter: TypeFilter = 'All';
  rows: BankAccountRow[] = [];

  private tree: BankAccount[] = [];

  readonly typeLabels = ACCOUNT_TYPE_LABELS;
  readonly typeClass = ACCOUNT_TYPE_CLASS;

  readonly typeFilters: { label: string; value: TypeFilter }[] = [
    { label: 'All', value: 'All' },
    { label: 'Asset', value: AccountType.Asset },
    { label: 'Liability', value: AccountType.Liability },
    { label: 'Expense', value: AccountType.Expense },
    { label: 'Revenue', value: AccountType.Revenue },
    { label: 'Equity', value: AccountType.Equilty },
  ];

  totalsByType: Partial<Record<AccountType, number>> = {};

  showCreateDialog = false;
  showChildDialog = false;
  showEditDialog = false;
  showDeleteDialog = false;

  parentOptions: BankAccount[] = [];

  createForm: FormGroup;
  editForm: FormGroup;

  selectedParent!: BankAccount;
  selectedAccount: BankAccountRow | null = null;
  showHistoryDialog = false;
  historyLoading = false;
  historyRows: JournalEntryHistoryRow[] = [];
  historyAccount: BankAccountRow | null = null;

  get historyTotalDebit(): number {
    return this.historyRows.reduce((sum, r) => sum + (r.debit || 0), 0);
  }

  get historyTotalCredit(): number {
    return this.historyRows.reduce((sum, r) => sum + (r.credit || 0), 0);
  }

  get historyNetTotal(): number {
    return this.historyTotalDebit - this.historyTotalCredit;
  }

  openHistoryDialog(row: BankAccountRow): void {
    this.historyAccount = row;
    this.historyRows = [];
    this.historyLoading = true;
    this.showHistoryDialog = true;

    this.bankService.getAccountHistory(row.id).subscribe({
      next: (data) => {
        this.historyRows = data ?? [];
        this.historyLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load account history.';
        this.historyLoading = false;
      },
    });
  }

  closeHistoryDialog(): void {
    this.showHistoryDialog = false;
    this.historyAccount = null;
    this.historyRows = [];
  }
  loadAll(): void {
    this.errorMessage = '';

    this.bankService.getAll().subscribe({
      next: (response) => {
        const flatList = response ?? [];

        this.tree = this.buildTree(flatList);
        this.rows = this.flatten(this.tree);
        this.computeTotals(this.tree);
        this.applyVisibility();

        this.cdr.detectChanges();
      },

      error: () => {
        this.errorMessage = 'Unable to load bank accounts.';
      },
    });
  }

  private buildTree(flatList: BankAccount[]): BankAccount[] {
    const byId = new Map<number, BankAccount>();

    for (const item of flatList) {
      byId.set(item.id, {
        ...item,
        children: [],
      });
    }

    const roots: BankAccount[] = [];

    for (const item of flatList) {
      const node = byId.get(item.id)!;

      if (item.parentId != null && byId.has(item.parentId)) {
        const parent = byId.get(item.parentId)!;

        parent.children = parent.children ?? [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private flatten(nodes: BankAccount[], level = 0): BankAccountRow[] {
    const output: BankAccountRow[] = [];

    for (const node of nodes) {
      const hasChildren = !!node.children?.length;

      output.push({
        ...node,
        level,
        expanded: true,
        visible: true,
        hasChildren,
      });

      if (hasChildren) {
        output.push(...this.flatten(node.children!, level + 1));
      }
    }

    return output;
  }

  private computeTotals(nodes: BankAccount[]): void {
    const totals: Partial<Record<AccountType, number>> = {};

    const walk = (accounts: BankAccount[]) => {
      for (const account of accounts) {
        if (!account.children?.length) {
          totals[account.type] = (totals[account.type] ?? 0) + (account.balance ?? 0);
        }

        if (account.children?.length) {
          walk(account.children);
        }
      }
    };

    walk(nodes);

    this.totalsByType = totals;
  }

  toggleExpand(row: BankAccountRow): void {
    row.expanded = !row.expanded;
    this.applyVisibility();
  }

  expandAll(): void {
    this.rows.forEach((r) => (r.expanded = true));
    this.applyVisibility();
  }

  collapseAll(): void {
    this.rows.forEach((r) => (r.expanded = false));
    this.applyVisibility();
  }

  private applyVisibility(): void {
    const collapsedLevels: number[] = [];

    for (const row of this.rows) {
      while (collapsedLevels.length && collapsedLevels[collapsedLevels.length - 1] >= row.level) {
        collapsedLevels.pop();
      }

      row.visible = collapsedLevels.length === 0;

      if (row.hasChildren && !row.expanded) {
        collapsedLevels.push(row.level);
      }
    }
  }

  matchesFilter(row: BankAccountRow): boolean {
    if (this.activeFilter !== 'All' && row.type !== this.activeFilter) {
      return false;
    }

    if (!this.searchTerm.trim()) {
      return true;
    }

    const term = this.searchTerm.trim().toLowerCase();

    return row.code.toLowerCase().includes(term) || row.name.toLowerCase().includes(term);
  }

  get visibleRows(): BankAccountRow[] {
    return this.rows.filter((row) => row.visible && this.matchesFilter(row));
  }

  setFilter(value: TypeFilter): void {
    this.activeFilter = value;
  }

  openCreateDialog(): void {
    this.createForm.get('code')?.setValidators(Validators.required);
    this.createForm.get('code')?.updateValueAndValidity();

    this.selectedParent = {
      code: 'None',
      name: 'Root Level',
    } as any;

    this.createForm.reset({
      code: '',
      name: '',
      parentId: null,
      type: AccountType.Asset,
    });

    this.showChildDialog = false;
    this.showCreateDialog = true;
  }

  closeCreateDialog(): void {
    this.showCreateDialog = false;
    this.showChildDialog = false;
  }

  openChildDialog(parent: BankAccountRow): void {
    this.selectedParent = parent;

    this.createForm.reset({
      code: '',
      name: '',
      parentId: parent.id,
      type: parent.type,
    });

    this.createForm.get('code')?.clearValidators();
    this.createForm.get('code')?.updateValueAndValidity();

    this.showCreateDialog = false;
    this.showChildDialog = true;
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.submitting = true;

    const payload = {
      ...this.createForm.getRawValue(),
      parentId: this.showChildDialog ? (this.selectedParent?.id ?? null) : null,
      type: +this.createForm.value.type,
    };

    this.bankService.create(payload).subscribe({
      next: () => {
        this.showCreateDialog = false;
        this.showChildDialog = false;
        this.loadAll();
        this.showCreateDialog = false;
      },

      error: () => {
        this.errorMessage = 'Unable to create bank account.';
      },

      complete: () => {
        this.submitting = false;
      },
    });
  }

  openEditDialog(row: BankAccountRow): void {
    this.selectedAccount = row;

    this.editForm.reset({
      code: row.code,
      name: row.name,
      type: row.type,
      isActive: row.isActive !== false,
    });

    this.showEditDialog = true;
  }

  closeEditDialog(): void {
    this.showEditDialog = false;
    this.selectedAccount = null;
  }

  submitEdit(): void {
    if (this.editForm.invalid || !this.selectedAccount) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.submitting = true;

    const payload = {
      ...this.editForm.getRawValue(),
      type: +this.editForm.value.type,
    };

    this.bankService.update(this.selectedAccount.id, payload).subscribe({
      next: () => {
        this.closeEditDialog();
        this.loadAll();
        this.showEditDialog = false;
      },

      error: () => {
        this.errorMessage = 'Unable to update bank account.';
      },

      complete: () => {
        this.submitting = false;
      },
    });
  }

  openDeleteDialog(row: BankAccountRow): void {
    this.selectedAccount = row;
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.selectedAccount = null;
  }

  confirmDelete(): void {
    if (!this.selectedAccount) {
      return;
    }

    this.deleting = true;

    this.bankService.delete(this.selectedAccount.id).subscribe({
      next: () => {
        this.closeDeleteDialog();
        this.loadAll();
        this.showDeleteDialog = false;
      },

      error: () => {
        this.errorMessage = 'Unable to delete bank account.';
      },

      complete: () => {
        this.deleting = false;
      },
    });
  }
}
