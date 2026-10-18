import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MasterDataService } from '../../services/master-data.service';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import {
  SearchableSelectComponent,
  SelectOption,
} from '../../components/searchable-select/searchable-select.component';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-raw-materials',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, SearchableSelectComponent],
  templateUrl: './raw-materials.component.html',
  styleUrl: './raw-materials.component.css',
})
export class RawMaterialsComponent {
  masterData = inject(MasterDataService);
  projectService = inject(ProjectService);
  authService = inject(AuthService);
  toastService = inject(ToastService);
  isAssigning = false;
  addingMaterialName = false;
  newMaterialName = '';
  savingMaterialName = false;
  managingMaterialNames = false;
  editingRawMaterialName: { id: number; name: string } | null = null;

  get canCreate() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin']);
  }
  get canUpdateLinks() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin']);
  }
  get canUpdateSuppliers() {
    return this.authService.hasAnyRole(['CEO', 'Admin']);
  }
  get canAssign() {
    return this.authService.hasAnyRole(['CEO', 'Engineer', 'Technician', 'Admin']);
  }

  pagination = useDynamicPagination();
  materialSearch = signal('');
  supplierSearch = '';
  editingSupplierSearch = '';

  filteredMaterials = computed(() => {
    const term = this.materialSearch().toLowerCase().trim();
    const data = this.masterData
      .RAW_ITEMS()
      .filter(
        (m) =>
          !term ||
          [
            m.code,
            m.name,
            m.unit,
            m.stockStatus,
            ...(m.suppliers?.map((s) => s.supplierName) ?? []),
          ]
            .join(' ')
            .toLowerCase()
            .includes(term),
      );
    return [...data].sort((a, b) => (b.currentStock ?? 0) - (a.currentStock ?? 0));
  });

  pagedMaterials = computed(() => {
    const data = this.filteredMaterials();
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  rawMaterialNameOptions = computed((): SelectOption[] =>
    this.masterData.RAW_MATERIAL_NAMES().map((item) => ({ value: item.name, label: item.name })),
  );

  projectOptions = computed((): SelectOption[] =>
    this.projectService.Projects().map((p) => ({ value: p.id, label: p.name })),
  );

  warehouseOptions = computed((): SelectOption[] =>
    this.masterData.WAREHOUSES().map((w) => ({ value: w.id, label: `${w.name} (${w.typeName})` })),
  );

  thirdWarehouseOptions = computed((): SelectOption[] =>
    this.masterData
      .WAREHOUSES()
      .filter((w) => w.typeName === 'ThirdWarehouse')
      .map((w) => ({ value: w.id, label: w.name })),
  );

  filteredSuppliers = computed(() => {
    const term = this.supplierSearch.toLowerCase().trim();
    return this.masterData.SUPPLIERS().filter((s) => !term || s.name.toLowerCase().includes(term));
  });

  filteredEditingSuppliers = computed(() => {
    const term = this.editingSupplierSearch.toLowerCase().trim();
    return this.masterData.SUPPLIERS().filter((s) => !term || s.name.toLowerCase().includes(term));
  });

  modalOpen = false;
  form = {
    code: '',
    name: '',
    unit: '',
    minStockLevel: 0,
    links: [] as { url: string; label?: string }[],
    suppliers: [] as { supplierId: number; isPreferred: boolean }[],
  };

  // edit state
  editOpen = false;
  editing: any = null; // RawMaterialResponseDto

  // assign state
  assignOpen = false;
  assignForm = { projectId: 0, fromWarehouseId: 0, toWarehouseId: 0, quantity: 0, notes: '' };

  closeModalIfOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.modalOpen = false;
    }
  }
  closeModal() {
    this.modalOpen = false;
    this.errors = {};
  }

  errors: Record<string, string> = {};

  private isValidUrl(value: string): boolean {
    try {
      const u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }
  private readonly CODE_REGEX = /^[A-Za-z0-9][A-Za-z0-9\-_]{0,29}$/; // RM-001, STEEL_01
  private readonly NAME_REGEX = /^\p{L}[\p{L} ]{1,99}$/u; // letters + numbers + spaces, at least one letter
  private readonly UNIT_REGEX = /^\p{L}{1,20}$/u; // letters + numbers, at least one letter
  validateForm(): boolean {
    this.errors = {};
    const f = this.form;

    // Code (optional)
    const code = (f.code ?? '').trim();
    if (code && !this.CODE_REGEX.test(code)) {
      this.errors['code'] =
        'Code accepts English letters, numbers, - and _ only (max 30 characters)';
    }
    this.validateName();
    this.validateUnit();
    // Min stock
    const min = Number(f.minStockLevel);
    if (f.minStockLevel === null || f.minStockLevel === ('' as any) || isNaN(min)) {
      this.errors['minStockLevel'] = 'Must be a valid number';
    } else if (min < 0) {
      this.errors['minStockLevel'] = 'Cannot be negative';
    }

    // Links
    if (!f.links.length) {
      this.errors['links'] = 'At least one link is required';
    } else if (f.links.some((l) => !this.isValidUrl((l.url ?? '').trim()))) {
      this.errors['links'] = 'One or more links are invalid (must start with http:// or https://)';
    }

    return Object.keys(this.errors).length === 0;
  }
  // Name: letters, numbers, spaces

  saveMaterial() {
    if (!this.validateForm()) return;

    this.masterData.addRawMaterial({
      code: this.form.code?.trim().toUpperCase() || undefined,
      name: this.form.name.trim(),
      unit: this.form.unit.trim(),
      minStockLevel: Number(this.form.minStockLevel),
      links: this.form.links.map((l) => ({
        url: l.url.trim(),
        label: l.label?.trim() || undefined,
      })),
      suppliers:
        this.form.suppliers?.map((s) => ({
          supplierId: s.supplierId,
          isPreferred: s.isPreferred,
        })) || [],
    });

    this.modalOpen = false;
    this.errors = {};
    this.form = { code: '', name: '', unit: '', minStockLevel: 0, links: [], suppliers: [] };
    this.toastService.show('Raw Material added successfully!');
    this.pagination.resetPage();
  }

  addMaterialName() {
    const name = this.newMaterialName.trim();
    if (!name || this.savingMaterialName) return;
    if (this.masterData.RAW_MATERIAL_NAMES().some((existing) => existing.name.toLowerCase() === name.toLowerCase())) {
      this.toastService.show('This raw material name already exists.');
      return;
    }

    this.savingMaterialName = true;
    this.masterData.addRawMaterialName(name).pipe(finalize(() => this.savingMaterialName = false)).subscribe({
      next: () => {
        this.masterData.fetchRawMaterialNames();
        this.form.name = name;
        this.validateName();
        this.newMaterialName = '';
        this.addingMaterialName = false;
        this.toastService.show('Raw material name added successfully.');
      },
      error: (err) => {
        console.error('Failed to add raw material name:', err);
        this.toastService.show('Failed to add raw material name.');
      },
    });
  }

  saveRawMaterialNameEdit() {
    const editing = this.editingRawMaterialName;
    const name = editing?.name.trim();
    if (!editing || !name || this.savingMaterialName) return;
    const wasSelected = this.form.name === this.masterData.RAW_MATERIAL_NAMES().find((item) => item.id === editing.id)?.name;
    if (this.masterData.RAW_MATERIAL_NAMES().some((item) => item.id !== editing.id && item.name.toLowerCase() === name.toLowerCase())) {
      this.toastService.show('This raw material name already exists.');
      return;
    }

    this.savingMaterialName = true;
    this.masterData.updateRawMaterialName(editing.id, name).pipe(finalize(() => this.savingMaterialName = false)).subscribe({
      next: () => {
        this.masterData.fetchRawMaterialNames();
        if (wasSelected) this.form.name = name;
        this.editingRawMaterialName = null;
        this.toastService.show('Raw material name updated successfully.');
      },
      error: (err) => {
        console.error('Failed to update raw material name:', err);
        this.toastService.show('Failed to update raw material name.');
      },
    });
  }

  deleteRawMaterialName(item: { id: number; name: string }) {
    if (!window.confirm(`Delete raw material name "${item.name}"?`)) return;
    this.masterData.deleteRawMaterialName(item.id).subscribe({
      next: () => {
        this.masterData.fetchRawMaterialNames();
        if (this.form.name === item.name) this.form.name = '';
        this.toastService.show('Raw material name deleted successfully.');
      },
      error: (err) => {
        console.error('Failed to delete raw material name:', err);
        this.toastService.show('Failed to delete raw material name.');
      },
    });
  }

  onlyCodeChars(event: KeyboardEvent) {
    if (!/[A-Za-z0-9\-_]/.test(event.key) && event.key.length === 1) event.preventDefault();
  }

  onlyNumbers(event: KeyboardEvent) {
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowed.includes(event.key)) return;
    if (!/^[0-9.]$/.test(event.key)) event.preventDefault();
  }

  sanitizeCode() {
    this.form.code = (this.form.code ?? '').replace(/[^A-Za-z0-9\-_]/g, '').toUpperCase();
  }

  addLinkToForm() {
    this.form.links.push({ url: '', label: '' });
  }
  validateName(): void {
    const name = (this.form.name ?? '').trim();
    delete this.errors['name'];
    if (!name) this.errors['name'] = 'Name is required';
    else if (!/\p{L}/u.test(name))
      this.errors['name'] = 'Name must include at least one letter (numbers only is not allowed)';
    else if (!/^[\p{L}\p{N} ]{2,100}$/u.test(name))
      this.errors['name'] =
        'Name can contain only letters, numbers, and spaces (2 to 100 characters)';
  }

  private validateUnit(): void {
    const unit = (this.form.unit ?? '').trim();
    delete this.errors['unit'];
    if (!unit) this.errors['unit'] = 'Unit is required';
    else if (!/\p{L}/u.test(unit))
      this.errors['unit'] = 'Unit must include at least one letter (numbers only is not allowed)';
    else if (!/^[\p{L}\p{N}]{1,20}$/u.test(unit))
      this.errors['unit'] = 'Unit can contain only letters and numbers (e.g. kg, pcs, m2)';
  }

  onNameInput(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^\p{L}\p{N} ]/gu, '');
    this.form.name = input.value;
    this.validateName(); // the error shows while typing
  }

  onUnitInput(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^\p{L}\p{N}]/gu, '');
    this.form.unit = input.value;
    this.validateUnit();
  }
  removeLinkFromForm(i: number) {
    this.form.links.splice(i, 1);
  }

  toggleSupplierSelection(supplier: any) {
    const idx = this.form.suppliers.findIndex((x: any) => x.supplierId === supplier.id);
    if (idx >= 0) this.form.suppliers.splice(idx, 1);
    else this.form.suppliers.push({ supplierId: supplier.id, isPreferred: false });
  }

  addLinkToEditing() {
    if (!this.editing) return;
    this.editing.links = this.editing.links ?? [];
    this.editing.links.push({ url: '', label: '' });
  }

  removeLinkFromEditing(i: number) {
    if (!this.editing) return;
    this.editing.links.splice(i, 1);
  }

  toggleEditingSupplier(s: any) {
    if (!this.editing) return;
    this.editing.suppliers = this.editing.suppliers ?? [];
    const idx = this.editing.suppliers.findIndex((x: any) => String(x.supplierId) === String(s.id));
    if (idx >= 0) {
      this.editing.suppliers.splice(idx, 1);
    } else {
      this.editing.suppliers.push({
        supplierId: Number(s.id),
        supplierName: s.name,
        isPreferred: false,
      });
    }
  }

  openEdit(m: any) {
    this.editing = JSON.parse(JSON.stringify(m));
    this.editing.links = (this.editing.links ?? []).map((l: any) => ({
      id: l.id,
      url: l.url || '',
      label: l.label || '',
    }));
    const supplierList = (this.editing.suppliers ?? [])
      .map((s: any) => ({
        supplierId: Number(s.supplierId ?? s.id ?? 0),
        supplierName: s.supplierName || s.name,
        isPreferred: !!s.isPreferred,
      }))
      .filter((s: any) => s.supplierId > 0);
    this.editing.suppliers = supplierList;
    this.editing.originalSupplierIds = new Set(supplierList.map((s: any) => s.supplierId));
    this.editOpen = true;
  }

  saveLinks() {
    if (!this.editing) return;
    const raw = (this.editing.links || []).map((l: any) => ({
      id: l.id,
      url: (l.url || '').trim(),
      label: (l.label || '').trim(),
    }));
    // remove empty urls and deduplicate by url
    const seen = new Set<string>();
    const links = raw
      .filter((l: any) => l.url)
      .filter((l: any) => {
        if (seen.has(l.url)) return false;
        seen.add(l.url);
        return true;
      })
      .map((l: any) =>
        l.id
          ? { id: l.id, url: l.url, label: l.label || undefined }
          : { url: l.url, label: l.label || undefined },
      );

    const payload = { links };
    console.debug('Updating links payload for raw material', this.editing?.id, payload);
    this.masterData.updateRawMaterialLinks(this.editing.id, payload).subscribe({
      next: (res) => {
        console.debug('Update links response:', res);
        this.toastService.show('Links updated.');
        this.masterData.fetchRawMaterials();
        this.editOpen = false;
      },
      error: (err) => {
        console.error('Failed to update links', err);
        this.toastService.show(err?.error?.message || 'Failed to update links');
      },
    });
  }

  saveSuppliers() {
    if (!this.editing) return;
    const allSuppliers = (this.editing.suppliers || [])
      .map((s: any) => ({
        supplierId: Number(s.supplierId ?? s.id ?? 0),
        isPreferred: !!s.isPreferred,
      }))
      .filter((s: any) => s.supplierId > 0)
      .reduce((acc: any[], cur: any) => {
        if (!acc.some((x) => x.supplierId === cur.supplierId)) acc.push(cur);
        return acc;
      }, []);

    const originalIds = new Set<number>(
      [...((this.editing.originalSupplierIds || []) as Set<number>)].map((id: any) => Number(id)),
    );
    const suppliers = allSuppliers.filter((s: any) => !originalIds.has(s.supplierId));

    if (suppliers.length === 0) {
      this.toastService.show('No supplier changes to save.');
      return;
    }

    const payload = { suppliers };
    console.debug(
      'Updating suppliers payload for raw material',
      this.editing?.id,
      payload,
      'originalIds',
      originalIds,
    );
    this.masterData.updateRawMaterialSuppliers(this.editing.id, payload).subscribe({
      next: (res) => {
        console.debug('Update suppliers response:', res);
        this.toastService.show('Suppliers updated.');
        this.masterData.fetchRawMaterials();
        this.editOpen = false;
      },
      error: (err) => {
        console.error('Failed to update suppliers', err);
        this.toastService.show(err?.error?.message || 'Failed to update suppliers');
      },
    });
  }

  openAssign(m: any) {
    this.assignOpen = true;
    this.editing = m;
    // default fromWarehouse to first RawMaterial-type warehouse
    const warehouses = this.masterData.WAREHOUSES();
    this.assignForm.fromWarehouseId =
      warehouses.find((w) => w.typeName === 'RawMaterial')?.id ?? warehouses[0]?.id ?? 0;
    this.assignForm.toWarehouseId =
      warehouses.find((w) => w.typeName === 'ThirdWarehouse')?.id ?? 0;
    this.assignForm.projectId = 0;
    this.assignForm.quantity = 0;
    this.assignForm.notes = '';
  }

  submitAssign() {
    const qty = Number(this.assignForm.quantity);
    if (!this.assignForm.projectId) return this.toastService.show('Please select a project');
    if (!this.assignForm.fromWarehouseId || !this.assignForm.toWarehouseId)
      return this.toastService.show('Please select both warehouses');
    if (this.assignForm.fromWarehouseId === this.assignForm.toWarehouseId)
      return this.toastService.show('Source and destination warehouses must be different');
    if (!Number.isFinite(qty) || qty <= 0)
      return this.toastService.show('Quantity must be a number greater than zero');
    if (!this.editing || this.isAssigning) return;
    const payload = {
      rawMaterialId: this.editing.id,
      projectId: Number(this.assignForm.projectId),
      fromWarehouseId: Number(this.assignForm.fromWarehouseId),
      toWarehouseId: Number(this.assignForm.toWarehouseId),
      quantity: Number(this.assignForm.quantity),
      notes: this.assignForm.notes || undefined,
    };
    this.isAssigning = true;
    this.masterData
      .assignMaterialToProject(payload)
      .pipe(finalize(() => (this.isAssigning = false)))
      .subscribe({
        next: () => {
          this.toastService.show('Assigned to project.');
          this.assignOpen = false;
          this.masterData.fetchRawMaterials();
        },
        error: (err) => console.error('Failed to assign material', err),
      });
  }
}

