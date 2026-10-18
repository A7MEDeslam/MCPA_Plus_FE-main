import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth.service';
import { CheckRequestService } from '../../services/check-request.service';
import { BankAccountService } from '../../services/bank-accounts';
import { ExpenseReportService } from '../../services/expense-report.service';
import {
  CheckRequest,
  CheckRequestStatus,
  CHECK_STATUS_LABELS,
  CHECK_STATUS_CLASS,
  statusFromString,
  ExpenseReport,
} from '../../models/check-request.dto';
import { BankAccount } from '../../models/bank-accounts.dto';
import { ExpenseCategory } from '../../models/expense-report.dto';
import { ChangeDetectorRef } from '@angular/core';
import { ElementRef, ViewChild } from '@angular/core';
import { PdfExport } from '../../services/pdf-export';
import { CheckBook, CreateCheckBook } from '../../models/checkbook.dto';
import { CheckBookService } from '../../services/checkbook';
type StatusFilter = 'All' | 'PendingApproval' | 'Approved' | 'Rejected' | 'Issued';
import {
  SearchableSelectComponent,
  SelectOption,
} from '../../components/searchable-select/searchable-select.component';
import { CheckReallocationService } from '../../services/check-reallocation';
import {
  CheckReallocation,
  REALLOCATION_STATUS_LABELS,
  REALLOCATION_STATUS_CLASS,
} from '../../models/check-reallocation.dto';
@Component({
  selector: 'app-check-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchableSelectComponent],
  templateUrl: './check-requests.html',
  styleUrl: './check-requests.css',
})
export class CheckRequests implements OnInit {
  private authService = inject(AuthService);
  private checkRequestService = inject(CheckRequestService);
  private bankAccountService = inject(BankAccountService);
  private checkReallocationService = inject(CheckReallocationService);
  private cdr = inject(ChangeDetectorRef);

  readonly Status = CheckRequestStatus;
  readonly statusLabels = CHECK_STATUS_LABELS;
  readonly statusClass = CHECK_STATUS_CLASS;

  checks: CheckRequest[] = [];
  bankAccounts: BankAccount[] = [];
  expenseReports: ExpenseReport[] = [];

  loading = false;
  error: string | null = null;
  private checkBookService = inject(CheckBookService);
  readonly reallocationStatusLabels = REALLOCATION_STATUS_LABELS;
  readonly reallocationStatusClass = REALLOCATION_STATUS_CLASS;

  // ---------- Page tabs ----------
  pageTab: 'checks' | 'reallocations' = 'checks';

  setPageTab(tab: 'checks' | 'reallocations'): void {
    this.pageTab = tab;
    if (tab === 'reallocations' && this.reallocations.length === 0) {
      this.loadReallocations();
    }
  }

  // ---------- Reallocations list ----------
  reallocations: CheckReallocation[] = [];
  reallocationsLoading = false;
  reallocationsError: string | null = null;
  // ---------- Reallocation details modal ----------
  showReallocationDetailsModal = false;
  reallocationDetailsLoading = false;
  reallocationDetailsError: string | null = null;
  reallocationDetailsTarget: CheckReallocation | null = null;

  viewReallocationDetails(r: CheckReallocation): void {
    this.reallocationDetailsTarget = null;
    this.reallocationDetailsError = null;
    this.reallocationDetailsLoading = true;
    this.showReallocationDetailsModal = true;

    this.checkReallocationService.getById(r.id).subscribe({
      next: (data) => {
        this.reallocationDetailsTarget = data;
        this.reallocationDetailsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.reallocationDetailsError = 'Could not load reallocation details.';
        this.reallocationDetailsLoading = false;
      },
    });
  }

  closeReallocationDetails(): void {
    this.showReallocationDetailsModal = false;
    this.reallocationDetailsTarget = null;
    this.reallocationDetailsError = null;
  }
  loadReallocations(): void {
    this.reallocationsLoading = true;
    this.reallocationsError = null;
    this.checkReallocationService.getAll().subscribe({
      next: (data) => {
        this.reallocations = data;
        this.reallocationsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.reallocationsError = 'Could not load reallocations.';
        this.reallocationsLoading = false;
      },
    });
  }

  // ---------- Request reallocation modal ----------
  showReallocationModal = false;
  reallocationTargetCheck: CheckRequest | null = null;
  reallocationExpenses: ExpenseReport[] = [];
  reallocationSelectedIds: number[] = [];
  reallocationReason = '';
  requestingReallocation = false;

  reallocationExpensesLoading = false;

  openReallocationModal(check: CheckRequest): void {
    this.reallocationTargetCheck = check;
    this.reallocationSelectedIds = [];
    this.reallocationReason = '';

    // نبدأ بعرض قايمة الـ approved لحد ما نجيب الـ expenses الحقيقية المرتبطة بالـ check
    this.reallocationExpenses = [...this.expenseReports];
    this.showReallocationModal = true;
    this.reallocationExpensesLoading = true;

    // نجيب الـ expenses المرتبطة فعليًا بالـ check بالـ ID، وندمجها مع الـ approved
    // عشان أي expense مرتبط بالشيك بس مش approved حاليًا يفضل ظاهر
    this.checkRequestService.getExpenses(check.id).subscribe({
      next: (attached) => {
        const merged = [...this.expenseReports];
        attached.forEach((exp) => {
          if (!merged.some((e) => e.id === exp.id)) {
            merged.push(exp);
          }
        });
        this.reallocationExpenses = merged;
        this.reallocationExpensesLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.reallocationExpensesLoading = false;
        this.error = "Could not load this check's expenses.";
      },
    });
  }
  closeReallocationModal(): void {
    this.showReallocationModal = false;
    this.reallocationTargetCheck = null;
    this.reallocationExpenses = [];
    this.reallocationSelectedIds = [];
    this.reallocationReason = '';
  }

  toggleReallocationExpense(id: number): void {
    const idx = this.reallocationSelectedIds.indexOf(id);
    idx > -1 ? this.reallocationSelectedIds.splice(idx, 1) : this.reallocationSelectedIds.push(id);
  }

  isReallocationExpenseSelected(id: number): boolean {
    return this.reallocationSelectedIds.includes(id);
  }

  get isReallocationFormValid(): boolean {
    return this.reallocationSelectedIds.length > 0 && this.reallocationReason.trim().length > 0;
  }

  submitReallocation(): void {
    if (
      !this.reallocationTargetCheck ||
      !this.isReallocationFormValid ||
      this.requestingReallocation
    )
      return;
    this.requestingReallocation = true;
    this.checkReallocationService
      .create(this.reallocationTargetCheck.id, {
        expenseReportIds: this.reallocationSelectedIds,
        reason: this.reallocationReason.trim(),
      })
      .subscribe({
        next: () => {
          this.requestingReallocation = false;
          this.closeReallocationModal();
          this.loadReallocations();
        },
        error: () => {
          this.requestingReallocation = false;
          this.error = 'Could not submit reallocation request.';
        },
      });
  }

  // ---------- Approve / reject a reallocation ----------
  showReviewReallocationModal = false;
  reviewReallocationAction: 'approve' | 'reject' | null = null;
  reviewReallocationTarget: CheckReallocation | null = null;
  reviewReallocationReason = '';
  reviewingReallocation = false;

  openReviewReallocation(realloc: CheckReallocation, action: 'approve' | 'reject'): void {
    if (!this.canApprove) return;
    this.reviewReallocationTarget = realloc;
    this.reviewReallocationAction = action;
    this.reviewReallocationReason = '';
    this.showReviewReallocationModal = true;
  }

  closeReviewReallocation(): void {
    this.showReviewReallocationModal = false;
    this.reviewReallocationTarget = null;
    this.reviewReallocationAction = null;
    this.reviewReallocationReason = '';
  }

  confirmReviewReallocation(): void {
    if (
      !this.reviewReallocationTarget ||
      !this.reviewReallocationAction ||
      this.reviewingReallocation
    )
      return;
    this.reviewingReallocation = true;
    const call =
      this.reviewReallocationAction === 'approve'
        ? this.checkReallocationService.approve(
            this.reviewReallocationTarget.id,
            this.reviewReallocationReason.trim(),
          )
        : this.checkReallocationService.reject(
            this.reviewReallocationTarget.id,
            this.reviewReallocationReason.trim(),
          );

    call.subscribe({
      next: () => {
        this.reviewingReallocation = false;
        this.closeReviewReallocation();
        this.loadReallocations();
        this.loadChecks();
      },
      error: () => {
        this.reviewingReallocation = false;
        this.error = `Could not ${this.reviewReallocationAction} reallocation.`;
      },
    });
  }
  checkBooks: CheckBook[] = [];

  // ---------- New Checkbook modal ----------
  showCreateCheckBookModal = false;
  savingCheckBook = false;
  newCheckBook: CreateCheckBook = {
    checkNumber: '',
    bankAccountId: null as unknown as number,
  };

  // ---------- Assign check number (Issue modal) ----------
  assigningCheckNumber = false;
  // table filter / search
  activeFilter: StatusFilter = 'All';
  private pdfExportService = inject(PdfExport);
  searchTerm = '';

  @ViewChild('printSection') printSection?: ElementRef<HTMLElement>;

  exportingPdf = false;
  // modals
  showCreateModal = false;
  showIssueModal = false;
  showEditModal = false;
  showDeleteModal = false;

  saving = false;
  deleting = false;

  // create form model
  form = {
    payeeName: '',
    bankAccountId: null as number | null,
    issueDate: this.today(),
    dueDate: '',
    checkBookId: null as number | null,
    notes: '',
    expenseReportIds: [] as number[],
  };

  // issue form
  issueTargetId: number | null = null;
  issueCheckNumber = '';

  // edit form
  editTargetId: number | null = null;
  editForm = {
    payeeName: '',
    bankAccountId: null as number | null,
    issueDate: '',
    dueDate: '',
    checkBookId: null as number | null,
    notes: '',
    expenseReportIds: [] as number[],
  };

  // Pool of expenses shown/selectable inside the Edit modal:
  // approved expenses + whatever is actually attached to the check being edited
  // (attached expenses may no longer be "approved", so they wouldn't otherwise show up)
  editExpenseReports: ExpenseReport[] = [];
  editExpensesLoading = false;

  // delete target
  deleteTargetId: number | null = null;
  deleteTargetLabel = '';
  private expenseReportService = inject(ExpenseReportService);

  categories: ExpenseCategory[] = [];
  // ---------- Details modal state ----------
  showDetailsModal = false;
  detailsLoading = false;
  detailsError: string | null = null;
  detailsCheck: CheckRequest | null = null;
  detailsExpenses: ExpenseReport[] = [];

  // add-expense picker (inside details)
  addExpenseId: number | null = null;
  addingExpense = false;

  // remove-from-check confirm
  showRemoveExpenseModal = false;
  expenseToRemove: ExpenseReport | null = null;
  removingExpense = false;

  // permanent delete confirm
  showDeleteExpenseModal = false;
  expenseToDeletePermanently: ExpenseReport | null = null;
  deletingExpensePermanently = false;

  viewDetails(check: CheckRequest): void {
    this.detailsCheck = check;
    this.detailsExpenses = [];
    this.detailsError = null;
    this.detailsLoading = true;
    this.addExpenseId = null;
    this.showDetailsModal = true;
    this.checkRequestService.getExpenses(check.id).subscribe({
      next: (data) => {
        this.detailsExpenses = data;
        this.detailsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.detailsError = 'Could not load expenses for this check.';
        this.detailsLoading = false;
      },
    });
  }

  closeDetails(): void {
    this.showDetailsModal = false;
    this.detailsCheck = null;
    this.detailsExpenses = [];
    this.addExpenseId = null;
  }

  private reloadDetailsExpenses(): void {
    if (!this.detailsCheck) return;
    this.checkRequestService.getExpenses(this.detailsCheck.id).subscribe({
      next: (data) => {
        this.detailsExpenses = data;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  // Approved expenses not already linked to this check — candidates to add
  get availableExpensesToAdd(): ExpenseReport[] {
    const attachedIds = this.detailsExpenses.map((e) => e.id);
    return this.expenseReports.filter((e) => !attachedIds.includes(e.id));
  }

  // ---------- Add an existing approved expense to this check ----------
  addExpenseToCheck(): void {
    if (!this.detailsCheck || !this.addExpenseId || this.addingExpense) return;

    const matchedAccount = this.bankAccounts.find(
      (a) => a.code === this.detailsCheck!.bankAccountCode,
    );

    const matchedCheckBook = this.checkBooks.find(
      (cb) =>
        cb.checkNumber === this.detailsCheck!.checkNumber &&
        (matchedAccount ? cb.bankAccountId === matchedAccount.id : true),
    );

    if (!matchedCheckBook) {
      this.detailsError = 'Could not resolve the checkbook for this check — cannot add expense.';
      return;
    }

    const newExpenseIds = [...this.detailsExpenses.map((e) => e.id), this.addExpenseId];

    this.addingExpense = true;
    this.checkRequestService
      .update(this.detailsCheck.id, {
        payeeName: this.detailsCheck.payeeName,
        bankAccountId: matchedAccount?.id as number,
        checkBookId: matchedCheckBook.id,
        issueDate: this.detailsCheck.issueDate,
        dueDate: this.detailsCheck.dueDate,
        notes: this.detailsCheck.notes ?? '',
        expenseReportIds: newExpenseIds,
      })
      .subscribe({
        next: () => {
          this.addingExpense = false;
          this.addExpenseId = null;
          this.reloadDetailsExpenses();
          this.loadChecks();
        },
        error: () => {
          this.addingExpense = false;
          this.detailsError = 'Could not add this expense to the check.';
        },
      });
  }

  // ---------- Remove from this check only (keeps the expense record) ----------
  openRemoveExpense(exp: ExpenseReport): void {
    this.expenseToRemove = exp;
    this.showRemoveExpenseModal = true;
  }

  closeRemoveExpense(): void {
    this.showRemoveExpenseModal = false;
    this.expenseToRemove = null;
  }

  confirmRemoveExpense(): void {
    if (!this.detailsCheck || !this.expenseToRemove || this.removingExpense) return;
    this.removingExpense = true;
    this.checkRequestService
      .removeExpense(this.detailsCheck.id, this.expenseToRemove.id)
      .subscribe({
        next: () => {
          this.removingExpense = false;
          this.closeRemoveExpense();
          this.reloadDetailsExpenses();
          this.loadChecks();
        },
        error: () => {
          this.removingExpense = false;
          this.detailsError = 'Could not remove this expense from the check.';
          this.closeRemoveExpense();
        },
      });
  }

  // ---------- Delete the expense entirely (unlinks + deletes the record) ----------
  openDeleteExpensePermanently(exp: ExpenseReport): void {
    this.expenseToDeletePermanently = exp;
    this.showDeleteExpenseModal = true;
  }

  closeDeleteExpensePermanently(): void {
    this.showDeleteExpenseModal = false;
    this.expenseToDeletePermanently = null;
  }

  confirmDeleteExpensePermanently(): void {
    if (!this.expenseToDeletePermanently || this.deletingExpensePermanently) return;
    this.deletingExpensePermanently = true;
    this.expenseReportService.delete(this.expenseToDeletePermanently.id).subscribe({
      next: () => {
        this.deletingExpensePermanently = false;
        this.closeDeleteExpensePermanently();
        this.reloadDetailsExpenses();
        this.loadChecks();
      },
      error: () => {
        this.deletingExpensePermanently = false;
        this.detailsError = 'Could not delete this expense.';
        this.closeDeleteExpensePermanently();
      },
    });
  }
  ngOnInit(): void {
    this.loadChecks();
    this.loadBankAccounts();
    this.loadExpenseReports();
    this.loadCategories();
    this.loadCheckBooks();
  }

  loadCheckBooks(): void {
    this.checkBookService.getAll().subscribe({
      next: (data) => (this.checkBooks = data),
      error: () => {},
    });
  }
  loadCategories(): void {
    this.expenseReportService.getCategories().subscribe({
      next: (data) => (this.categories = data),
      error: () => {},
    });
  }
  loadExpenseReports(): void {
    this.expenseReportService.getApproved().subscribe({
      next: (data) => {
        this.expenseReports = data.map((e) => ({
          ...e,
          employeeName: e.employeeName ?? '',
          documentNumber: e.documentNumber ?? '',
          accountCode: e.accountCode ?? '',
        }));
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }
  get canApprove(): boolean {
    return this.authService.hasAnyRole(['CEO']);
  }

  get canIssue(): boolean {
    return this.authService.hasAnyRole(['CEO', 'Accountant']);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  loadChecks(): void {
    this.loading = true;
    this.error = null;
    this.checkRequestService.getAll().subscribe({
      next: (data) => {
        this.checks = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Could not load check requests.';
        this.loading = false;
      },
    });
  }

  loadBankAccounts(): void {
    this.bankAccountService.getAll().subscribe({
      next: (data) => (this.bankAccounts = data.filter((a) => a.isActive !== false)),
      error: () => {},
    });
  }

  // ---------- Summary counts ----------
  get total(): number {
    return this.checks.length;
  }
  get pendingCount(): number {
    return this.checks.filter((c) => c.status === 'PendingApproval').length;
  }
  get pendingAmount(): number {
    return this.checks
      .filter((c) => c.status === 'PendingApproval')
      .reduce((sum, c) => sum + c.amount, 0);
  }
  get approvedCount(): number {
    return this.checks.filter((c) => c.status === 'Approved').length;
  }
  get issuedCount(): number {
    return this.checks.filter((c) => c.status === 'Issued').length;
  }
  get issuedAmount(): number {
    return this.checks.filter((c) => c.status === 'Issued').reduce((sum, c) => sum + c.amount, 0);
  }

  // ---------- Table filtering ----------
  setFilter(filter: StatusFilter): void {
    this.activeFilter = filter;
    this.cdr.detectChanges();
  }

  get filteredChecks(): CheckRequest[] {
    let rows = this.checks;
    if (this.activeFilter !== 'All') {
      rows = rows.filter((c) => c.status === this.activeFilter);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      rows = rows.filter(
        (c) =>
          c.requestNumber.toLowerCase().includes(term) ||
          c.payeeName.toLowerCase().includes(term) ||
          (c.checkNumber ?? '').toLowerCase().includes(term),
      );
    }
    return rows;
  }

  statusOf(check: CheckRequest): CheckRequestStatus {
    return statusFromString(check.status);
  }

  canEdit(check: CheckRequest): boolean {
    return check.status === 'PendingApproval';
  }

  canDelete(check: CheckRequest): boolean {
    return check.status === 'PendingApproval';
  }

  // ---------- Create modal ----------
  openCreateModal(): void {
    this.form = {
      payeeName: '',
      bankAccountId: null,
      issueDate: this.today(),
      dueDate: '',
      checkBookId: null,
      notes: '',
      expenseReportIds: [],
    };
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  toggleExpenseReport(id: number): void {
    const idx = this.form.expenseReportIds.indexOf(id);
    if (idx > -1) {
      this.form.expenseReportIds.splice(idx, 1);
    } else {
      this.form.expenseReportIds.push(id);
    }
  }

  isExpenseSelected(id: number): boolean {
    return this.form.expenseReportIds.includes(id);
  }

  // Amount is derived automatically from the selected expense reports
  get computedAmount(): number {
    return this.expenseReports
      .filter((e) => this.form.expenseReportIds.includes(e.id))
      .reduce((sum, e) => sum + e.amount, 0);
  }

  get isFormValid(): boolean {
    return (
      this.form.payeeName.trim().length > 0 &&
      this.form.bankAccountId !== null &&
      this.form.issueDate.trim().length > 0 &&
      this.form.dueDate.trim().length > 0 &&
      this.form.expenseReportIds.length > 0
    );
  }

  submitCreate(): void {
    if (!this.isFormValid || this.saving) {
      return;
    }
    this.saving = true;
    this.checkRequestService
      .create({
        payeeName: this.form.payeeName.trim(),
        bankAccountId: this.form.bankAccountId as number,
        checkBookId: this.form.checkBookId,
        issueDate: new Date(this.form.issueDate).toISOString(),
        dueDate: this.form.dueDate
          ? new Date(this.form.dueDate).toISOString()
          : new Date(this.form.issueDate).toISOString(),
        notes: this.form.notes.trim(),
        expenseReportIds: this.form.expenseReportIds,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.showCreateModal = false;
          this.loadChecks();
        },
        error: () => {
          this.saving = false;
          this.error = 'Could not create check request.';
        },
      });
  }

  // ---------- Approve / Reject ----------
  approve(check: CheckRequest): void {
    this.checkRequestService.approve(check.id).subscribe({
      next: () => {
        this.loadChecks();
      },
      error: () => {
        this.error = 'Could not approve check request.';
      },
    });
  }

  reject(check: CheckRequest): void {
    if (!this.canApprove) return;
    this.checkRequestService.reject(check.id).subscribe({
      next: () => {
        this.loadChecks();
        this.cdr.detectChanges();
      },
      error: () => (this.error = 'Could not reject check request.'),
    });
  }

  // ---------- Issue ----------
  openIssueModal(check: CheckRequest): void {
    this.issueTargetId = check.id;
    this.issueCheckNumber = check.checkNumber ?? '';
    this.showIssueModal = true;
  }

  closeIssueModal(): void {
    this.showIssueModal = false;
    this.issueTargetId = null;
    this.issueCheckNumber = '';
  }

  submitIssue(): void {
    if (!this.issueTargetId || !this.issueCheckNumber.trim() || this.saving) {
      return;
    }
    this.saving = true;
    this.checkRequestService
      .issue(this.issueTargetId, { checkNumber: this.issueCheckNumber.trim() })
      .subscribe({
        next: () => {
          this.saving = false;
          this.closeIssueModal();
          this.loadChecks();
          this.cdr.detectChanges();
        },
        error: () => {
          this.saving = false;
          this.error = 'Could not issue check.';
        },
      });
  }

  // ---------- Edit ----------
  openEditModal(check: CheckRequest): void {
    this.editTargetId = check.id;

    const matchedAccount = this.bankAccounts.find((a) => a.code === check.bankAccountCode);

    // الـ backend مش بيرجّع checkBookId، فبنستنتجه من تطابق checkNumber + bankAccountCode
    const matchedCheckBook = this.checkBooks.find(
      (cb) =>
        cb.checkNumber === check.checkNumber &&
        (matchedAccount ? cb.bankAccountId === matchedAccount.id : true),
    );

    this.editForm = {
      payeeName: check.payeeName,
      bankAccountId: matchedAccount?.id ?? null,
      checkBookId: matchedCheckBook?.id ?? null,
      issueDate: check.issueDate.slice(0, 10),
      dueDate: check.dueDate ? check.dueDate.slice(0, 10) : '',
      notes: check.notes ?? '',
      expenseReportIds: [],
    };

    // نبدأ بعرض قايمة الـ approved لحد ما نجيب الـ expenses الحقيقية المرتبطة بالـ check
    this.editExpenseReports = [...this.expenseReports];
    this.showEditModal = true;
    this.editExpensesLoading = true;

    // بنجيب الـ expenses المرتبطة فعليًا بالـ check بالـ ID مباشرة (مش matching بالاسم)
    // ده بيحل مشكلة إن أي expense مرتبط بالـ check بس مش موجود في قايمة الـ approved
    // ما كانش بيظهر في المودال أصلاً
    this.checkRequestService.getExpenses(check.id).subscribe({
      next: (attached) => {
        const merged = [...this.expenseReports];
        attached.forEach((exp) => {
          if (!merged.some((e) => e.id === exp.id)) {
            merged.push(exp);
          }
        });
        this.editExpenseReports = merged;
        this.editForm.expenseReportIds = attached.map((e) => e.id);
        this.editExpensesLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.editExpensesLoading = false;
        this.error = "Could not load this check's expenses for editing.";
      },
    });
  }
  closeEditModal(): void {
    this.showEditModal = false;
    this.editTargetId = null;
    this.editExpenseReports = [];
  }

  toggleEditExpenseReport(id: number): void {
    const idx = this.editForm.expenseReportIds.indexOf(id);
    if (idx > -1) {
      this.editForm.expenseReportIds.splice(idx, 1);
    } else {
      this.editForm.expenseReportIds.push(id);
    }
  }

  isEditExpenseSelected(id: number): boolean {
    return this.editForm.expenseReportIds.includes(id);
  }

  get editComputedAmount(): number {
    return this.editExpenseReports
      .filter((e) => this.editForm.expenseReportIds.includes(e.id))
      .reduce((sum, e) => sum + e.amount, 0);
  }

  get isEditFormValid(): boolean {
    return (
      this.editForm.payeeName.trim().length > 0 &&
      this.editForm.bankAccountId !== null &&
      this.editForm.issueDate.trim().length > 0 &&
      this.editForm.dueDate.trim().length > 0 &&
      this.editForm.expenseReportIds.length > 0
    );
  }

  submitEdit(): void {
    if (!this.isEditFormValid || !this.editTargetId || this.saving) {
      return;
    }
    this.saving = true;
    this.checkRequestService
      .update(this.editTargetId, {
        payeeName: this.editForm.payeeName.trim(),
        bankAccountId: this.editForm.bankAccountId as number,
        checkBookId: this.editForm.checkBookId,
        issueDate: new Date(this.editForm.issueDate).toISOString(),
        dueDate: this.editForm.dueDate
          ? new Date(this.editForm.dueDate).toISOString()
          : new Date(this.editForm.issueDate).toISOString(),
        notes: this.editForm.notes.trim(),
        expenseReportIds: this.editForm.expenseReportIds,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.closeEditModal();
          this.loadChecks();
        },
        error: () => {
          this.saving = false;
          this.error = 'Could not update check request.';
        },
      });
  }

  // ---------- Delete ----------
  openDeleteModal(check: CheckRequest): void {
    this.deleteTargetId = check.id;
    this.deleteTargetLabel = `${check.requestNumber} - ${check.payeeName}`;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteTargetId = null;
    this.deleteTargetLabel = '';
  }

  confirmDelete(): void {
    if (!this.deleteTargetId || this.deleting) {
      return;
    }
    this.deleting = true;
    this.checkRequestService.delete(this.deleteTargetId).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteExpenseModal = false;
        this.cdr.detectChanges();
        this.closeDeleteModal();
        this.loadChecks();
      },
      error: () => {
        this.deleting = false;
        this.error = 'Could not delete check request.';
      },
    });
  }
  exportDetailsPdf(): void {
    if (!this.printSection || this.exportingPdf) return;

    const element = this.printSection.nativeElement;
    const noPrintEls = element.querySelectorAll<HTMLElement>('.no-print');
    noPrintEls.forEach((el) => (el.style.display = 'none'));

    this.exportingPdf = true;
    const filename = `Check-${this.detailsCheck?.requestNumber ?? 'details'}`;

    this.pdfExportService
      .export(element, filename)
      .then(() => {
        this.exportingPdf = false;
        noPrintEls.forEach((el) => (el.style.display = ''));
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.exportingPdf = false;
        noPrintEls.forEach((el) => (el.style.display = ''));
        this.error = 'Could not export PDF.';
        this.cdr.detectChanges();
      });
  }
  openCreateCheckBookModal(): void {
    this.newCheckBook = { checkNumber: '', bankAccountId: this.form.bankAccountId as number };
    this.showCreateCheckBookModal = true;
  }

  closeCreateCheckBookModal(): void {
    this.showCreateCheckBookModal = false;
  }

  get isNewCheckBookValid(): boolean {
    return (
      this.newCheckBook.checkNumber.trim().length > 0 && this.newCheckBook.bankAccountId !== null
    );
  }

  submitCreateCheckBook(): void {
    if (!this.isNewCheckBookValid || this.savingCheckBook) return;
    this.savingCheckBook = true;
    this.checkBookService.create(this.newCheckBook).subscribe({
      next: (created) => {
        this.savingCheckBook = false;
        this.checkBooks = [...this.checkBooks, created];
        this.closeCreateCheckBookModal();
        this.cdr.detectChanges();
      },
      error: () => {
        this.savingCheckBook = false;
        this.error = 'Could not create checkbook.';
      },
    });
  }

  assignCheckNumber(): void {
    if (!this.issueTargetId || this.assigningCheckNumber) return;
    this.assigningCheckNumber = true;
    this.checkRequestService.getCheckBookNumber(this.issueTargetId).subscribe({
      next: (checkNumber) => {
        this.issueCheckNumber = checkNumber;
        this.assigningCheckNumber = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.assigningCheckNumber = false;
        this.error = 'Could not assign a check number from the checkbook.';
      },
    });
  }
  get availableCheckBooks(): CheckBook[] {
    if (!this.form.bankAccountId) return this.checkBooks;
    return this.checkBooks.filter((cb) => cb.bankAccountId === this.form.bankAccountId);
  }

  get availableEditCheckBooks(): CheckBook[] {
    const base = !this.editForm.bankAccountId
      ? this.checkBooks
      : this.checkBooks.filter((cb) => cb.bankAccountId === this.editForm.bankAccountId);

    if (this.editForm.checkBookId && !base.some((cb) => cb.id === this.editForm.checkBookId)) {
      const current = this.checkBooks.find((cb) => cb.id === this.editForm.checkBookId);
      if (current) return [current, ...base];
    }
    return base;
  }
  get bankAccountOptions(): SelectOption[] {
    return this.bankAccounts.map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` }));
  }

  get checkBookOptions(): SelectOption[] {
    return this.availableCheckBooks.map((cb) => ({
      value: cb.id,
      label: `${cb.checkNumber} (${cb.bankAccountCode})`,
    }));
  }

  get editBankAccountOptions(): SelectOption[] {
    return this.bankAccounts.map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` }));
  }

  get editCheckBookOptions(): SelectOption[] {
    return this.availableEditCheckBooks.map((cb) => ({
      value: cb.id,
      label: `${cb.checkNumber} (${cb.bankAccountCode})`,
    }));
  }

  get newCheckBookBankOptions(): SelectOption[] {
    return this.bankAccounts.map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` }));
  }

  get addExpenseOptions(): SelectOption[] {
    return this.availableExpensesToAdd.map((e) => ({
      value: e.id,
      label: `${e.documentNumber} — ${e.description} (${e.amount} ${e.currency})`,
    }));
  }
}
