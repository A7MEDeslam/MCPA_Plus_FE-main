import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { MasterDataService } from '../../services/master-data.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { SearchableSelectComponent, SelectOption } from '../../components/searchable-select/searchable-select.component';

type ProductForm = {
  name: string;
  modelType: string;
  serialPrefix: string;
  serialStartNumber: string; // string عشان نتحكم في الكتابة، وبنحوله لرقم وقت الحفظ
};

const emptyForm = (): ProductForm => ({
  name: '',
  modelType: '',
  serialPrefix: '',
  serialStartNumber: '0',
});

@Component({
  selector: 'app-finished-products',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, SearchableSelectComponent],
  templateUrl: './finished-products.component.html',
  styleUrl: './finished-products.component.css',
})
export class FinishedProductsComponent {
  masterData = inject(MasterDataService);
  authService = inject(AuthService);
  toastService = inject(ToastService);
  router = inject(Router);

  get canCreate() {
    return this.authService.hasAnyRole(['CEO', 'Engineer', 'Admin', 'Technician']);
  }
  get canEdit() {
    return this.authService.hasAnyRole(['CEO']);
  }
  get canDelete() {
    return this.authService.hasAnyRole(['CEO']);
  }
  get canViewSerials() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin']);
  }

  viewProductSerials(productId: number) {
    this.router.navigate(['/serials'], { queryParams: { type: 'product', id: productId, returnUrl: '/products' } });
  }

  pagination = useDynamicPagination();
  productSearch = signal('');
  productNameManagementSearch = signal('');
  addingProductName = false;
  newProductName = '';
  managingProductNames = false;
  editingProductName: { id: number; name: string } | null = null;
  savingProductName = false;

  productNameOptions = computed((): SelectOption[] =>
    this.masterData.FINISHED_PRODUCT_NAMES().map((item) => ({ value: item.name, label: item.name })),
  );

  filteredManagedProductNames = computed(() => {
    const term = this.productNameManagementSearch().trim().toLowerCase();
    return this.masterData.FINISHED_PRODUCT_NAMES().filter((item) => !term || item.name.toLowerCase().includes(term));
  });

  // ── Stats ─────────────────────────────────────────────────
  totalProducts = computed(() => this.masterData.PRODUCTS().length);
  inStockCount = computed(
    () => this.masterData.PRODUCTS().filter((p) => (p.currentStock ?? 0) > 0).length,
  );
  outOfStockCount = computed(() => this.totalProducts() - this.inStockCount());

  filteredProducts = computed(() => {
    const term = this.productSearch().toLowerCase().trim();
    const data = this.masterData
      .PRODUCTS()
      .filter(
        (p) =>
          !term ||
          [p.code, p.name, p.modelType, p.serialPrefix].join(' ').toLowerCase().includes(term),
      );
    return [...data].sort((a, b) => (b.currentStock ?? 0) - (a.currentStock ?? 0));
  });

  pagedProducts = computed(() => {
    const data = this.filteredProducts();
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  // ── State ─────────────────────────────────────────────────
  modalOpen = false;
  form: ProductForm = emptyForm();

  editModalOpen = false;
  editId = 0;
  editForm: ProductForm = emptyForm();

  deleteModalOpen = false;
  deleteTarget: { id: number; name: string } | null = null;

  submitted = false; // بعد أول محاولة حفظ نظهر كل الأخطاء
  isSaving = false;
  isDeleting = false;

  // ── Validation ────────────────────────────────────────────
  validate(f: ProductForm): Record<string, string> {
    const e: Record<string, string> = {};

    const name = f.name.trim();
    if (!name) e['name'] = 'Name is required';
    else if (name.length > 100) e['name'] = 'Name cannot exceed 100 characters';

    const model = f.modelType.trim();
    if (model && !/^(?=.*\p{L})[\p{L}\p{N} ]{1,50}$/u.test(model))
      e['modelType'] = 'Letters and numbers only, with at least one letter (e.g. GenieAgro6600)';

    const prefix = f.serialPrefix.trim();
    if (!prefix) e['serialPrefix'] = 'Serial prefix is required';
    else if (!/^[A-Z]{1,10}$/.test(prefix))
      e['serialPrefix'] = 'English letters only, no spaces (max 10)';

    const start = f.serialStartNumber.trim();
    if (start === '')
      e['serialStartNumber'] = 'Start number is required (use 0 to start from the beginning)';
    else if (!/^\d{1,9}$/.test(start)) e['serialStartNumber'] = 'Digits only (max 9 digits)';

    return e;
  }

  get createErrors() {
    return this.validate(this.form);
  }
  get editErrors() {
    return this.validate(this.editForm);
  }

  /** يظهر الخطأ لو المستخدم كتب في الحقل أو حاول يحفظ */
  showError(errs: Record<string, string>, key: string, value: string): string {
    return errs[key] && (this.submitted || value.length > 0) ? errs[key] : '';
  }

  // ── Input sanitizers (بتمنع الكتابة الغلط واللصق الغلط) ────
  onNameInput(e: Event, f: ProductForm) {
    const el = e.target as HTMLInputElement;
    el.value = el.value
      .replace(/[^\p{L} ]/gu, '')
      .replace(/^ +/, '')
      .replace(/ {2,}/g, ' ');
    f.name = el.value;
  }

  onModelInput(e: Event, f: ProductForm) {
    const el = e.target as HTMLInputElement;
    el.value = el.value
      .replace(/[^\p{L}\p{N} ]/gu, '')
      .replace(/^ +/, '')
      .replace(/ {2,}/g, ' ');
    f.modelType = el.value;
  }

  onPrefixInput(e: Event, f: ProductForm) {
    const el = e.target as HTMLInputElement;
    el.value = el.value.replace(/[^A-Za-z]/g, '').toUpperCase();
    f.serialPrefix = el.value;
  }

  onNumberInput(e: Event, f: ProductForm) {
    const el = e.target as HTMLInputElement;
    el.value = el.value.replace(/\D/g, '').slice(0, 9);
    f.serialStartNumber = el.value;
  }

  /** معاينة أول سيريال (عدّل المعادلة لو الباك إند بيحسبها بشكل مختلف) */
  serialPreview(f: ProductForm): string {
    const prefix = f.serialPrefix || 'PREFIX';
    const n = Number(f.serialStartNumber || 0) + 1;
    return `${prefix}-${String(n).padStart(6, '0')}`;
  }

  // ── Modals ────────────────────────────────────────────────
  openCreate() {
    this.form = emptyForm();
    this.submitted = false;
    this.modalOpen = true;
  }

  closeAll() {
    if (this.isSaving || this.isDeleting) return;
    this.modalOpen = false;
    this.editModalOpen = false;
    this.deleteModalOpen = false;
    this.submitted = false;
  }

  closeModalIfOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) this.closeAll();
  }

  // ── Create ────────────────────────────────────────────────
  saveProduct() {
    this.submitted = true;
    if (Object.keys(this.createErrors).length) return;

    this.masterData.addFinishedProduct({
      name: this.form.name.trim(),
      modelType: this.form.modelType.trim() || undefined,
      serialPrefix: this.form.serialPrefix.trim(),
      serialStartNumber: Number(this.form.serialStartNumber),
    } as any);

    this.closeAll();
    this.form = emptyForm();
    this.toastService.show('Finished product added successfully!');
    this.pagination.resetPage();
  }

  addProductName() {
    const name = this.newProductName.trim();
    if (!name || this.savingProductName) return;
    if (this.masterData.FINISHED_PRODUCT_NAMES().some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      this.toastService.show('This finished product name already exists.');
      return;
    }
    this.savingProductName = true;
    this.masterData.addFinishedProductName(name).pipe(finalize(() => this.savingProductName = false)).subscribe({
      next: () => {
        this.masterData.fetchFinishedProductNames();
        (this.editModalOpen ? this.editForm : this.form).name = name;
        this.newProductName = '';
        this.addingProductName = false;
        this.toastService.show('Finished product name added successfully.');
      },
      error: (err: any) => this.toastService.show(err?.error?.message ?? 'Failed to add finished product name.'),
    });
  }

  saveProductNameEdit() {
    const editing = this.editingProductName;
    const name = editing?.name.trim();
    if (!editing || !name || this.savingProductName) return;
    if (this.masterData.FINISHED_PRODUCT_NAMES().some((item) => item.id !== editing.id && item.name.toLowerCase() === name.toLowerCase())) {
      this.toastService.show('This finished product name already exists.');
      return;
    }
    const wasSelected = this.form.name === this.masterData.FINISHED_PRODUCT_NAMES().find((item) => item.id === editing.id)?.name;
    const editWasSelected = this.editForm.name === this.masterData.FINISHED_PRODUCT_NAMES().find((item) => item.id === editing.id)?.name;
    this.savingProductName = true;
    this.masterData.updateFinishedProductName(editing.id, name).pipe(finalize(() => this.savingProductName = false)).subscribe({
      next: () => {
        this.masterData.fetchFinishedProductNames();
        if (wasSelected) this.form.name = name;
        if (editWasSelected) this.editForm.name = name;
        this.editingProductName = null;
        this.toastService.show('Finished product name updated successfully.');
      },
      error: (err: any) => this.toastService.show(err?.error?.message ?? 'Failed to update finished product name.'),
    });
  }

  deleteProductName(item: { id: number; name: string }) {
    if (!window.confirm(`Delete finished product name "${item.name}"?`)) return;
    this.masterData.deleteFinishedProductName(item.id).subscribe({
      next: () => {
        this.masterData.fetchFinishedProductNames();
        if (this.form.name === item.name) this.form.name = '';
        if (this.editForm.name === item.name) this.editForm.name = '';
        this.toastService.show('Finished product name deleted successfully.');
      },
      error: (err: any) => this.toastService.show(err?.error?.message ?? 'Failed to delete finished product name.'),
    });
  }

  // ── Edit ──────────────────────────────────────────────────
  openEdit(p: any) {
    this.editId = p.id;
    this.editForm = {
      name: p.name ?? '',
      modelType: p.modelType ?? '',
      serialPrefix: (p.serialPrefix ?? '').toUpperCase(),
      serialStartNumber: String(p.serialStartNumber ?? 0),
    };
    this.submitted = false;
    this.editModalOpen = true;
  }

  saveEdit() {
    this.submitted = true;
    if (Object.keys(this.editErrors).length || this.isSaving) return;

    this.isSaving = true;
    this.masterData
      .updateFinishedProduct(this.editId, {
        name: this.editForm.name.trim(),
        modelType: this.editForm.modelType.trim() || undefined,
        serialPrefix: this.editForm.serialPrefix.trim(),
        serialStartNumber: Number(this.editForm.serialStartNumber),
      })
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.editModalOpen = false;
          this.submitted = false;
          this.toastService.show('Product updated successfully!');
        },
        error: (err: any) => this.toastService.show(err?.error?.message ?? 'Update failed.'),
      });
  }

  // ── Delete ────────────────────────────────────────────────
  openDelete(p: any) {
    this.deleteTarget = { id: p.id, name: p.name };
    this.deleteModalOpen = true;
  }

  confirmDelete() {
    if (!this.deleteTarget || this.isDeleting) return;
    this.isDeleting = true;

    this.masterData
      .deleteFinishedProduct(this.deleteTarget.id)
      .pipe(finalize(() => (this.isDeleting = false)))
      .subscribe({
        next: () => {
          this.deleteModalOpen = false;
          this.deleteTarget = null;
          this.toastService.show('Product deleted successfully!');
        },
        error: (err: any) => this.toastService.show(err?.error?.message ?? 'Delete failed.'),
      });
  }
}
