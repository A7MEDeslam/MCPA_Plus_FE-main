// src/app/pages/semi-finished-products/semi-finished-products.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';

import { SemiFinishedService } from '../../services/semi-finished.service';
import { ProjectService } from '../../services/project.service';
import { MasterDataService } from '../../services/master-data.service';
import { ToastService } from '../../services/toast.service';
import { SemiFinished, SemiFinishedAssignment, Engineer } from '../../models/Semi-finished.dto';

type ModalMode = 'none' | 'create' | 'edit' | 'produce' | 'assign' | 'delete';
type FormKey = 'product' | 'produce' | 'assign';

// ───────── Custom validators ─────────

/** Letters and spaces only, 2 to 100 characters */
const lettersOnly: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = String(c.value ?? '').trim();
  if (!v) return null; // required is handled separately
  return /^\p{L}[\p{L} ]{1,99}$/u.test(v) ? null : { lettersOnly: true };
};

/** Letters, numbers and spaces, at least one letter */
const alphanumericWithLetter: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = String(c.value ?? '').trim();
  if (!v) return null;
  return /^(?=.*\p{L})[\p{L}\p{N} ]{1,50}$/u.test(v) ? null : { alphanumeric: true };
};

/** Whole numbers only (no decimals, no negatives) */
const wholeNumber: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = c.value;
  if (v === null || v === undefined || v === '') return null;
  return /^\d{1,9}$/.test(String(v)) ? null : { wholeNumber: true };
};

/** Free text without < > */
const safeText: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = String(c.value ?? '');
  return /[<>]/.test(v) ? { safeText: true } : null;
};

@Component({
  selector: 'app-semi-finished-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './semi-finished-products.html',
  styleUrl: './semi-finished-products.css',
})
export class SemiFinishedProductsComponent implements OnInit {
  private semiFinishedService = inject(SemiFinishedService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private toast = inject(ToastService);
  projectService = inject(ProjectService);
  masterDataService = inject(MasterDataService);

  // data
  items: SemiFinished[] = [];
  assignments: SemiFinishedAssignment[] = [];
  engineers: Engineer[] = [];

  // ui state
  activeTab: 'products' | 'assignments' = 'products';
  searchTerm = '';
  loading = false;
  saving = false;
  errorMessage = '';

  modalMode: ModalMode = 'none';
  selectedItem: SemiFinished | null = null;

  // forms
  productForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100), lettersOnly]],
    modelType: ['', [Validators.required, Validators.maxLength(50), alphanumericWithLetter]],
    currentStock: ['0' as string | number, [Validators.required, wholeNumber]],
  });

  produceForm = this.fb.group({
    quantity: ['1' as string | number, [Validators.required, wholeNumber, Validators.min(1)]],
  });

  assignForm = this.fb.group({
    assignTarget: ['project' as 'project' | 'engineer', Validators.required],
    projectId: [null as number | null, Validators.required],
    engineerId: [null as string | null],
    quantity: ['1' as string | number, [Validators.required, wholeNumber, Validators.min(1)]],
    notes: ['', [Validators.maxLength(200), safeText]],
  });

  ngOnInit(): void {
    this.loadProducts();
    this.loadEngineers();
    this.projectService.fetchAll();

    // Auto-fill Model Type when the name matches a finished product
    this.productForm.get('name')?.valueChanges.subscribe((value) => {
      if (!value) return;
      const match = this.masterDataService
        .PRODUCTS()
        .find((p) => (p.name ?? '').trim().toLowerCase() === value.trim().toLowerCase());
      if (match) {
        this.productForm.get('modelType')?.setValue(match.modelType, { emitEvent: false });
      }
    });
  }

  // ---------- validation helpers (used by the template) ----------

  /** Returns a single FormGroup type so .get() works for all three forms */
  private groupOf(form: FormKey): FormGroup {
    return (form === 'product'
      ? this.productForm
      : form === 'produce'
        ? this.produceForm
        : this.assignForm) as unknown as FormGroup;
  }

  /** Error message shown once the field is touched or typed in */
  err(form: FormKey, field: string): string {
    const c = this.groupOf(form).get(field);
    if (!c || !c.errors || !(c.dirty || c.touched)) return '';

    const e = c.errors;
    if (e['required']) return 'This field is required';
    if (e['lettersOnly']) return 'Letters only (2 to 100 characters), no numbers or symbols';
    if (e['alphanumeric']) return 'Letters and numbers only, with at least one letter';
    if (e['wholeNumber']) return 'Whole numbers only (digits 0-9)';
    if (e['min']) return `Must be at least ${e['min'].min}`;
    if (e['maxlength']) return `Maximum ${e['maxlength'].requiredLength} characters`;
    if (e['safeText']) return 'The characters < and > are not allowed';
    return 'Invalid value';
  }

  /** Blocks wrong characters while typing or pasting */
  sanitize(event: Event, form: FormKey, field: string, kind: 'letters' | 'alnum' | 'digits'): void {
    const el = event.target as HTMLInputElement;
    let v = el.value;

    if (kind === 'letters') v = v.replace(/[^\p{L} ]/gu, '');
    if (kind === 'alnum') v = v.replace(/[^\p{L}\p{N} ]/gu, '');
    if (kind === 'digits') v = v.replace(/\D/g, '').slice(0, 9);

    if (kind !== 'digits') v = v.replace(/^ +/, '').replace(/ {2,}/g, ' ');

    el.value = v;
    const ctrl = this.groupOf(form).get(field);
    ctrl?.setValue(v);
    ctrl?.markAsDirty();
  }

  blockNonDigitKeys(event: KeyboardEvent): void {
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowed.includes(event.key) || event.ctrlKey || event.metaKey) return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
  }

  len(form: 'product' | 'assign', field: string): number {
    return String(this.groupOf(form).get(field)?.value ?? '').length;
  }

  // ---------- data loading ----------

  loadProducts(): void {
    this.loading = true;
    this.semiFinishedService.getAll().subscribe({
      next: (data) => {
        this.items = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load semi-finished products.';
        this.loading = false;
      },
    });
  }

  loadAssignments(): void {
    this.loading = true;
    this.semiFinishedService.getAssignments().subscribe({
      next: (data) => {
        this.assignments = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load assignments.';
        this.loading = false;
      },
    });
  }

  loadEngineers(): void {
    this.semiFinishedService.getEngineers().subscribe({
      next: (data) => (this.engineers = data),
      error: () => {},
    });
  }

  switchTab(tab: 'products' | 'assignments'): void {
    this.activeTab = tab;
    if (tab === 'assignments' && this.assignments.length === 0) {
      this.loadAssignments();
    }
  }

  // ---------- computed ----------

  get filteredItems(): SemiFinished[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.items;
    return this.items.filter(
      (i) =>
        i.code.toLowerCase().includes(term) ||
        i.name.toLowerCase().includes(term) ||
        i.modelType.toLowerCase().includes(term),
    );
  }

  get finishedProductNames(): string[] {
    return this.masterDataService
      .PRODUCTS()
      .map((p) => p.name)
      .filter((name): name is string => !!name);
  }

  // ---------- stats ----------

  get totalItems(): number {
    return this.items.length;
  }
  get inStockCount(): number {
    return this.items.filter((i) => i.currentStock > 0).length;
  }
  get outOfStockCount(): number {
    return this.totalItems - this.inStockCount;
  }
  get totalStockUnits(): number {
    return this.items.reduce((sum, i) => sum + (i.currentStock ?? 0), 0);
  }

  // ---------- create / edit ----------

  openCreateModal(): void {
    this.selectedItem = null;
    this.productForm.reset({ name: '', modelType: '', currentStock: '0' });
    this.modalMode = 'create';
  }

  openEditModal(item: SemiFinished): void {
    this.selectedItem = item;
    this.productForm.reset({
      name: item.name,
      modelType: item.modelType,
      currentStock: String(item.currentStock ?? 0),
    });
    this.modalMode = 'edit';
  }

  saveProduct(): void {
    if (this.productForm.invalid || this.saving) {
      this.productForm.markAllAsTouched();
      return;
    }
    const raw = this.productForm.getRawValue();
    const payload = {
      name: String(raw.name).trim(),
      modelType: String(raw.modelType).trim(),
      currentStock: Number(raw.currentStock),
    };

    const request$ =
      this.modalMode === 'edit' && this.selectedItem
        ? this.semiFinishedService.update(this.selectedItem.id, payload)
        : this.semiFinishedService.create(payload);

    this.saving = true;
    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        const wasEdit = this.modalMode === 'edit';
        this.closeModal();
        this.loadProducts();
        this.toast.show(wasEdit ? 'Product updated successfully!' : 'Product added successfully!');
      },
      error: (err) => {
        this.toast.show(err?.error?.message || 'Failed to save the semi-finished product.');
      },
    });
  }

  // ---------- delete ----------

  openDeleteConfirm(item: SemiFinished): void {
    this.selectedItem = item;
    this.modalMode = 'delete';
  }

  confirmDelete(): void {
    if (!this.selectedItem || this.saving) return;
    this.saving = true;
    this.semiFinishedService
      .delete(this.selectedItem.id)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.closeModal();
          this.loadProducts();
          this.toast.show('Product deleted successfully!');
        },
        error: (err) => {
          this.toast.show(err?.error?.message || 'Failed to delete the item.');
        },
      });
  }

  // ---------- produce ----------

  openProduceModal(item: SemiFinished): void {
    this.selectedItem = item;
    this.produceForm.reset({ quantity: '1' });
    this.modalMode = 'produce';
  }

  submitProduce(): void {
    if (this.produceForm.invalid || !this.selectedItem || this.saving) {
      this.produceForm.markAllAsTouched();
      return;
    }
    const quantity = Number(this.produceForm.value.quantity);

    this.saving = true;
    this.semiFinishedService
      .produce({ semiFinishedId: this.selectedItem.id, quantity })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.closeModal();
          this.loadProducts();
          this.toast.show('Production recorded.');
        },
        error: (err) => {
          this.toast.show(err?.error?.message || 'Failed to record production.');
        },
      });
  }

  // ---------- assign ----------

  openAssignModal(item: SemiFinished): void {
    this.selectedItem = item;
    this.assignForm.reset({
      assignTarget: 'project',
      projectId: null,
      engineerId: null,
      quantity: '1',
      notes: '',
    });
    this.setAssignTarget('project');
    this.modalMode = 'assign';
  }

  setAssignTarget(target: 'project' | 'engineer'): void {
    this.assignForm.get('assignTarget')?.setValue(target);
    const projectCtrl = this.assignForm.get('projectId');
    const engineerCtrl = this.assignForm.get('engineerId');

    if (target === 'project') {
      projectCtrl?.setValidators([Validators.required]);
      engineerCtrl?.clearValidators();
      engineerCtrl?.setValue(null);
    } else {
      engineerCtrl?.setValidators([Validators.required]);
      projectCtrl?.clearValidators();
      projectCtrl?.setValue(null);
    }
    projectCtrl?.updateValueAndValidity();
    engineerCtrl?.updateValueAndValidity();
  }

  submitAssign(): void {
    if (this.assignForm.invalid || !this.selectedItem || this.saving) {
      this.assignForm.markAllAsTouched();
      return;
    }
    const { assignTarget, projectId, engineerId, quantity, notes } = this.assignForm.getRawValue();
    const qty = Number(quantity);

    // Cannot assign more than what is in stock
    if (qty > (this.selectedItem.currentStock ?? 0)) {
      this.toast.show(`Only ${this.selectedItem.currentStock} units available in stock`);
      return;
    }

    this.saving = true;
    this.semiFinishedService
      .assign({
        semiFinishedId: this.selectedItem.id,
        quantity: qty,
        projectId: assignTarget === 'project' ? (projectId as number) : 0,
        engineerId: assignTarget === 'engineer' ? engineerId : null,
        notes: (notes || '').trim(),
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.closeModal();
          this.loadProducts();
          this.assignments = [];
          this.toast.show('Assigned successfully.');
        },
        error: (err) => {
          this.toast.show(err?.error?.message || 'Failed to assign the item.');
        },
      });
  }

  // ---------- shared ----------

  closeModal(): void {
    if (this.saving) return;
    this.modalMode = 'none';
    this.selectedItem = null;
    this.errorMessage = '';
  }

  closeIfOverlay(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) this.closeModal();
  }

  formatDate(value: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }
}
