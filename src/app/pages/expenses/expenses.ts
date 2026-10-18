import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth.service';
import { ExpenseReportService } from '../../services/expense-report.service';
import { BankAccountService } from '../../services/bank-accounts';
import {
  ExpenseReport,
  ExpenseCategory,
  expenseStatusClass,
  expenseStatusLabel,
} from '../../models/expense-report.dto';
import { BankAccount, AccountType } from '../../models/bank-accounts.dto';
import { ChangeDetectorRef } from '@angular/core';
import {
  SearchableSelectComponent,
  SelectOption,
} from '../../components/searchable-select/searchable-select.component';

type StatusFilter = 'All' | 'PendingApproval' | 'Approved' | 'Rejected' | 'AssignedToCheck';
@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchableSelectComponent],
  templateUrl: './expenses.html',
  styleUrl: './expenses.css',
})
export class Expenses implements OnInit {
  private authService = inject(AuthService);
  private expenseReportService = inject(ExpenseReportService);
  private bankAccountService = inject(BankAccountService);
  private cdr = inject(ChangeDetectorRef);

  readonly statusClass = expenseStatusClass;
  readonly statusLabel = expenseStatusLabel;

  readonly costCenters = ['CC-ADMIN', 'CC-OPS', 'CC-SALES', 'CC-IT', 'CC-HR'];

  expenses: ExpenseReport[] = [];
  categories: ExpenseCategory[] = [];
  glAccounts: BankAccount[] = [];

  loading = false;
  error: string | null = null;

  activeFilter: StatusFilter = 'All';
  searchTerm = '';

  showCreateModal = false;
  saving = false;
  showRejectModal = false;
  rejectReason = '';
  selectedExpense: ExpenseReport | null = null;

  showDetailsModal = false;

  showDeleteModal = false;
  expenseToDelete: ExpenseReport | null = null;

  // --- Edit modal state ---
  showEditModal = false;
  editingExpense: ExpenseReport | null = null;
  editSaving = false;

  // --- Category management state ---
  showCategoriesModal = false;
  newCategoryName = '';
  categorySaving = false;
  categoryError: string | null = null;
  categoryToDelete: ExpenseCategory | null = null;
  showDeleteCategoryModal = false;

  viewDetails(expense: ExpenseReport) {
    this.selectedExpense = expense;
    this.showDetailsModal = true;
  }

  closeDetails() {
    this.showDetailsModal = false;
  }
  form = {
    employeeName: '',
    employeeId: '',
    department: '',
    expenseDate: this.today(),
    amount: null as number | null,
    currency: 'USD',
    categoryId: null as number | null,
    costCenter: this.costCenters[0],
    accountId: null as number | null,
    description: '',
  };

  editForm = {
    expenseDate: this.today(),
    amount: null as number | null,
    currency: 'USD',
    categoryId: null as number | null,
    accountId: null as number | null,
    description: '',
  };

  get canApprove(): boolean {
    return this.authService.hasAnyRole(['CEO', 'Accountant']);
  }

  ngOnInit(): void {
    this.loadExpenses();
    this.loadCategories();
    this.loadGlAccounts();
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  loadExpenses(): void {
    this.loading = true;
    this.error = null;
    this.expenseReportService.getAll().subscribe({
      next: (data) => {
        this.expenses = data;
        this.loading = false;
        this.cdr.detectChanges();
        this.showRejectModal = false;
      },
      error: () => {
        this.error = 'Could not load expense reports.';
        this.loading = false;
      },
    });
  }

  loadCategories(): void {
    this.expenseReportService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  loadGlAccounts(): void {
    this.bankAccountService.getAll().subscribe({
      next: (data) => {
        this.glAccounts = data.filter((a) => a.isActive !== false);
      },
      error: () => {},
    });
  }

  // ---------- Summary ----------
  get total(): number {
    return this.expenses.length;
  }
  get pendingCount(): number {
    return this.expenses.filter((e) => e.status === 'PendingApproval').length;
  }
  get pendingAmount(): number {
    return this.expenses
      .filter((e) => e.status === 'PendingApproval')
      .reduce((sum, e) => sum + e.amount, 0);
  }
  get approvedCount(): number {
    return this.expenses.filter((e) => e.status === 'Approved').length;
  }
  get assignedToCheckCount(): number {
    return this.expenses.filter((e) => e.status === 'AssignedToCheck').length;
  }
  get assignedToCheckAmount(): number {
    return this.expenses
      .filter((e) => e.status === 'AssignedToCheck')
      .reduce((sum, e) => sum + e.amount, 0);
  }

  // ---------- Filtering ----------
  setFilter(filter: StatusFilter): void {
    this.activeFilter = filter;
  }

  get filteredExpenses(): ExpenseReport[] {
    let rows = this.expenses;
    if (this.activeFilter !== 'All') {
      rows = rows.filter((e) => e.status === this.activeFilter);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      rows = rows.filter(
        (e) =>
          (e.documentNumber ?? '').toLowerCase().includes(term) ||
          (e.employeeName ?? '').toLowerCase().includes(term) ||
          e.description.toLowerCase().includes(term),
      );
    }
    return rows;
  }

  // ---------- Create modal ----------
  openCreateModal(): void {
    this.form = {
      employeeName: '',
      employeeId: '',
      department: '',
      expenseDate: this.today(),
      amount: null,
      currency: 'USD',
      categoryId: null,
      costCenter: this.costCenters[0],
      accountId: null,
      description: '',
    };
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  get isFormValid(): boolean {
    return (
      !!this.form.amount &&
      this.form.amount > 0 &&
      !!this.form.categoryId &&
      !!this.form.accountId &&
      !!this.form.expenseDate
    );
  }

  submitCreate(): void {
    if (!this.isFormValid || this.saving) {
      return;
    }
    this.saving = true;
    this.expenseReportService
      .create({
        accountId: this.form.accountId as number,
        amount: this.form.amount as number,
        currency: this.form.currency,
        expenseDate: new Date(this.form.expenseDate).toISOString(),
        description: this.form.description.trim(),
        categoryId: this.form.categoryId as number,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.showCreateModal = false;
          this.loadExpenses();
        },
        error: () => {
          this.saving = false;
          this.error = 'Could not create expense report.';
        },
      });
  }

  // ---------- Edit modal ----------
  openEdit(expense: ExpenseReport): void {
    this.editingExpense = expense;
    this.editForm = {
      expenseDate: (expense.date ?? this.today()).slice(0, 10),
      amount: expense.amount,
      currency: expense.currency,
      categoryId: (expense as any).categoryId ?? null,
      accountId: (expense as any).accountId ?? null,
      description: expense.description,
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingExpense = null;
  }

  get isEditFormValid(): boolean {
    return (
      !!this.editForm.amount &&
      this.editForm.amount > 0 &&
      !!this.editForm.categoryId &&
      !!this.editForm.accountId &&
      !!this.editForm.expenseDate
    );
  }

  submitEdit(): void {
    if (!this.editingExpense || !this.isEditFormValid || this.editSaving) {
      return;
    }
    this.editSaving = true;
    this.expenseReportService
      .update(this.editingExpense.id, {
        accountId: this.editForm.accountId as number,
        categoryId: this.editForm.categoryId as number,
        amount: this.editForm.amount as number,
        currency: this.editForm.currency,
        expenseDate: new Date(this.editForm.expenseDate).toISOString(),
        description: this.editForm.description.trim(),
      })
      .subscribe({
        next: () => {
          this.editSaving = false;
          this.closeEditModal();
          this.loadExpenses();
        },
        error: () => {
          this.editSaving = false;
          this.error = 'Could not update expense report.';
        },
      });
  }

  // ---------- Category management ----------
  openCategoriesModal(): void {
    this.newCategoryName = '';
    this.categoryError = null;
    this.showCategoriesModal = true;
  }

  closeCategoriesModal(): void {
    this.showCategoriesModal = false;
    this.newCategoryName = '';
    this.categoryError = null;
  }

  submitNewCategory(): void {
    const name = this.newCategoryName.trim();
    if (!name || this.categorySaving) {
      return;
    }
   if (!this.categoryNameRegex.test(name)) {
     this.categoryError = 'Category name can contain letters, spaces, & and - only.';
     return;
   }
    this.categorySaving = true;
    this.categoryError = null;
    this.expenseReportService.createCategory(name).subscribe({
      next: () => {
        this.categorySaving = false;
        this.newCategoryName = '';
        this.loadCategories();
        this.cdr.detectChanges();
        this.showCategoriesModal = false;
      },
      error: () => {
        this.categorySaving = false;
        this.categoryError = 'Could not create category.';
      },
    });
  }

  openDeleteCategory(category: ExpenseCategory): void {
    this.categoryToDelete = category;
    this.showDeleteCategoryModal = true;
  }

  cancelDeleteCategory(): void {
    this.showDeleteCategoryModal = false;
    this.categoryToDelete = null;
  }

  confirmDeleteCategory(): void {
    if (!this.categoryToDelete) return;
    this.expenseReportService.deleteCategory(this.categoryToDelete.id).subscribe({
      next: () => {
        this.showDeleteCategoryModal = false;
        this.categoryToDelete = null;
        this.loadCategories();
        this.cdr.detectChanges();
      },
      error: () => {
        this.categoryError = 'Could not delete category.';
        this.showDeleteCategoryModal = false;
        this.categoryToDelete = null;
      },
    });
  }

  // ---------- Approve / Reject ----------
  approve(expense: ExpenseReport): void {
    if (!this.canApprove) return;
    this.expenseReportService.approve(expense.id).subscribe({
      next: () => this.loadExpenses(),
      error: () => (this.error = 'Could not approve expense report.'),
    });
  }
  openReject(expense: ExpenseReport) {
    this.selectedExpense = expense;
    this.rejectReason = '';
    this.showRejectModal = true;
  }
  confirmReject() {
    if (!this.selectedExpense) return;

    this.expenseReportService
      .reject(this.selectedExpense.id, {
        reason: this.rejectReason,
      })
      .subscribe({
        next: () => {
          this.showRejectModal = false;
          this.loadExpenses();
        },
        error: () => {
          this.error = 'Could not reject expense report.';
        },
      });
  }

  remove(expense: ExpenseReport): void {
    this.expenseToDelete = expense;
    this.showDeleteModal = true;
  }
  confirmDelete(): void {
    if (!this.expenseToDelete) return;

    this.expenseReportService.delete(this.expenseToDelete.id).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.expenseToDelete = null;
        this.loadExpenses();
      },
      error: () => {
        this.error = 'Could not delete expense report.';
      },
    });
  }
  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.expenseToDelete = null;
  }
  get categoryOptions(): SelectOption[] {
    return this.categories.map((c) => ({ value: c.id, label: c.name }));
  }

  get glAccountOptions(): SelectOption[] {
    return this.glAccounts.map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` }));
  }
  
  private readonly categoryNameRegex =
    /^[A-Za-z\u0600-\u06FF]+(?:\s*[&-]\s*|\s)[A-Za-z\u0600-\u06FF]+(?:(?:\s*[&-]\s*|\s)[A-Za-z\u0600-\u06FF]+)*$|^[A-Za-z\u0600-\u06FF]+$/;

  onCategoryNameInput(event: Event) {
    const el = event.target as HTMLInputElement;

    const cleaned = el.value
      .replace(/[^A-Za-z\u0600-\u06FF\s&-]/g, '') 
      .replace(/^[\s&-]+/, '') 
      .replace(/\s{2,}/g, ' ') 
      .replace(/([&-])\1+/g, '$1'); 

    if (el.value !== cleaned) {
      el.value = cleaned;
    }
    this.newCategoryName = cleaned;
    this.categoryError = null;
  }
}
