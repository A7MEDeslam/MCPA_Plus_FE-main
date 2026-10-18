import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom, finalize } from 'rxjs';

import { WorkOrderService } from '../../services/work-order.service';
import { BomService } from '../../services/bom.service';
import { MasterDataService } from '../../services/master-data.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';

import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';

import {
  SearchableSelectComponent,
  SelectOption,
} from '../../components/searchable-select/searchable-select.component';

type BomLineType = 'raw' | 'semi';

interface BomLine {
  type: BomLineType;
  rawMaterialId: number;
  semiFinishedId: number;
  qty: number | null;
}

interface BomForm {
  finishedProductId: number;
  semiFinishedId: number;
  lines: BomLine[];
}

interface EditingBomEntry {
  id: number;
  type: BomLineType;
  rawMaterialId: number;
  semiFinishedId: number;
  qty: number;
}

@Component({
  selector: 'app-bom-consume',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, SearchableSelectComponent],
  templateUrl: './bom-consume.component.html',
  styleUrl: './bom-consume.component.css',
})
export class BomConsumeComponent {
  workOrderService = inject(WorkOrderService);
  bomService = inject(BomService);
  masterData = inject(MasterDataService);
  toastService = inject(ToastService);
  authService = inject(AuthService);
  router = inject(Router);
  bomLoading = signal(false);
  previewLoading = signal(false);
  saving = signal(false);
  posting = signal(false);
  // =========================================================
  // Permissions
  // =========================================================

  get canManageBom(): boolean {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer']);
  }

  get canEditDeleteBom(): boolean {
    return this.authService.hasAnyRole(['CEO']);
  }

  get canCompleteWorkOrder(): boolean {
    return this.authService.hasAnyRole(['CEO', 'Engineer', 'Accountant']);
  }

  // =========================================================
  // Dropdown Options
  // =========================================================

  rawMaterialOptions = computed((): SelectOption[] =>
    this.masterData.RAW_ITEMS().map((material) => ({
      value: material.id,
      label:
        `${material.code ? material.code + ' – ' : ''}` +
        `${material.name}` +
        `${material.unit ? ' (' + material.unit + ')' : ''}`,
    })),
  );

  semiFinishedOptions = computed((): SelectOption[] =>
    this.masterData.SEMI_ITEMS().map((item: any) => ({
      value: item.id,
      label: `${item.code ? item.code + ' – ' : ''}` + `${item.name}`,
    })),
  );

  finishedProductOptions = computed((): SelectOption[] =>
    this.masterData.PRODUCTS().map((product) => ({
      value: product.id,
      label: `${product.code ? product.code + ' – ' : ''}` + `${product.name}`,
    })),
  );

  // =========================================================
  // Tabs and Modal State
  // =========================================================

  bomTab: 'def' | 'post' = 'def';

  definitionTab: 'finished' | 'semiFinished' = 'finished';

  modalOpen = false;

  bomProductId = 0;

  bomSemiFinishedId = 0;

  // =========================================================
  // BOM Form
  // =========================================================

  bomForm: BomForm = {
    finishedProductId: 0,
    semiFinishedId: 0,
    lines: [this.createEmptyBomLine()],
  };

  private createEmptyBomLine(): BomLine {
    return {
      type: 'raw',
      rawMaterialId: 0,
      semiFinishedId: 0,
      qty: null,
    };
  }

  // =========================================================
  // Consumption Form
  // =========================================================

  consumeForm = {
    woId: 0,
    qty: null as number | null,
    rawWarehouseId: 5,
    finishedWarehouseId: 9,
    productionDate: this.workOrderService.today,
  };

  consumePreview: any[] = [];

  previewError = '';

  // =========================================================
  // Computed Data
  // =========================================================

  activeProdOrders = computed(() =>
    this.workOrderService
      .WorkOrders()
      .filter((workOrder) => workOrder.status === 'InProduction' || workOrder.status === 'Partial'),
  );

  pagination = useDynamicPagination();

  bomEntries = computed(() => this.bomService.BomEntries());

  pagedBomEntries = computed(() => {
    const data = this.bomService.BomEntries();
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();

    const startIndex = (page - 1) * size;
    const endIndex = page * size;

    return data.slice(startIndex, endIndex);
  });

  editingEntry: EditingBomEntry | null = null;

  // =========================================================
  // BOM Context Navigation
  // =========================================================

  switchDefTab(tab: 'finished' | 'semiFinished'): void {
    this.definitionTab = tab;

    this.bomProductId = 0;
    this.bomSemiFinishedId = 0;

    this.bomService.BomEntries.set([]);
    this.pagination.resetPage();

    this.cancelEdit();
  }

  loadBomEntries(): void {
    this.pagination.resetPage();
    this.cancelEdit();

    const id = this.definitionTab === 'finished' ? this.bomProductId : this.bomSemiFinishedId;

    if (!id) {
      this.bomService.BomEntries.set([]);
      return;
    }

    this.bomLoading.set(true);

    const request$ =
      this.definitionTab === 'finished'
        ? this.bomService.fetchByFinishedProduct(id)
        : this.bomService.fetchSemiFinishedDetails(id);

    request$.pipe(finalize(() => this.bomLoading.set(false))).subscribe({
      next: (data) => this.bomService.BomEntries.set(data),
      error: () => this.bomService.BomEntries.set([]),
    });
  }

  // =========================================================
  // Modal Multi-line Management
  // =========================================================

  openModal(): void {
    if (this.definitionTab === 'finished' && !this.bomProductId) {
      alert('Please select a finished product first.');
      return;
    }

    if (this.definitionTab === 'semiFinished' && !this.bomSemiFinishedId) {
      alert('Please select a semi-finished product first.');
      return;
    }

    this.bomForm = {
      finishedProductId: this.bomProductId,
      semiFinishedId: this.bomSemiFinishedId,
      lines: [this.createEmptyBomLine()],
    };

    this.modalOpen = true;
  }

  addLine(): void {
    this.bomForm.lines.push(this.createEmptyBomLine());
  }

  removeLine(index: number): void {
    if (this.bomForm.lines.length <= 1) {
      return;
    }

    this.bomForm.lines.splice(index, 1);
  }

  onLineTypeChange(line: BomLine): void {
    line.qty = null;

    if (line.type === 'raw') {
      // السطر Raw فقط
      line.semiFinishedId = 0;
    } else {
      // السطر Semi فقط
      line.rawMaterialId = 0;
    }
  }

  closeModalIfOverlay(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (target.classList.contains('modal-overlay')) {
      this.modalOpen = false;
    }
  }

  // =========================================================
  // Save BOM
  // =========================================================

  async saveBOM(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      if (this.definitionTab === 'finished') {
        await this.saveFinishedProductBom();
      } else {
        await this.saveSemiFinishedComposition();
      }
    } finally {
      this.saving.set(false);
    }
  }

  private async saveFinishedProductBom(): Promise<void> {
    const form = this.bomForm;

    if (!form.finishedProductId) {
      alert('Please select a finished product.');
      return;
    }

    const validationError = this.validateFinishedProductLines(form.lines);

    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      const requests = form.lines.map((line) => {
        /*
         * كل Row يرسل نوعًا واحدًا فقط:
         *
         * Raw Row:
         * finishedProductId
         * rawMaterialId
         * rawMaterialQtyPerUnit
         *
         * Semi Row:
         * finishedProductId
         * semiFinishedId
         * semiFinishedQtyPerUnit
         */

        if (line.type === 'raw') {
          return firstValueFrom(
            this.bomService.createBomEntry({
              finishedProductId: form.finishedProductId,

              rawMaterialId: line.rawMaterialId,

              rawMaterialQtyPerUnit: Number(line.qty),
            }),
          );
        }

        return firstValueFrom(
          this.bomService.createBomEntry({
            finishedProductId: form.finishedProductId,

            semiFinishedId: line.semiFinishedId,

            semiFinishedQtyPerUnit: Number(line.qty),
          }),
        );
      });

      await Promise.all(requests);

      this.loadBomEntries();

      this.modalOpen = false;

      this.toastService.show('BOM Matrix saved successfully.');
    } catch (error: any) {
      alert(error?.error?.message || 'Error processing BOM operations.');
    }
  }

  private validateFinishedProductLines(lines: BomLine[]): string | null {
    if (!lines.length) {
      return 'Please add at least one BOM row.';
    }

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const rowNumber = index + 1;

      if (line.qty === null || Number(line.qty) <= 0) {
        return `Please enter a valid quantity in row ${rowNumber}.`;
      }

      if (line.type === 'raw' && !line.rawMaterialId) {
        return `Please select a Raw Material in row ${rowNumber}.`;
      }

      if (line.type === 'semi' && !line.semiFinishedId) {
        return `Please select a Semi-Finished product in row ${rowNumber}.`;
      }

      if (line.type === 'raw' && line.semiFinishedId) {
        return `Row ${rowNumber} cannot contain Raw Material and Semi-Finished together.`;
      }

      if (line.type === 'semi' && line.rawMaterialId) {
        return `Row ${rowNumber} cannot contain Raw Material and Semi-Finished together.`;
      }
    }

    return null;
  }

  private async saveSemiFinishedComposition(): Promise<void> {
    const form = this.bomForm;

    if (!form.semiFinishedId) {
      alert('Please select a semi-finished product.');
      return;
    }

    /*
     * داخل تبويب Semi-Finished Composition
     * السطور تكون Raw Material فقط.
     */

    for (let index = 0; index < form.lines.length; index++) {
      const line = form.lines[index];
      const rowNumber = index + 1;

      if (!line.rawMaterialId) {
        alert(`Please select a Raw Material in row ${rowNumber}.`);
        return;
      }

      if (line.qty === null || Number(line.qty) <= 0) {
        alert(`Please enter a valid quantity in row ${rowNumber}.`);
        return;
      }
    }

    try {
      const requests = form.lines.map((line) =>
        firstValueFrom(
          this.bomService.createSemiFinishedEntry({
            semiFinishedId: form.semiFinishedId,

            rawMaterialId: line.rawMaterialId,

            qtyPerUnit: Number(line.qty),
          }),
        ),
      );

      await Promise.all(requests);
await Promise.all(requests);

this.modalOpen = false;
this.loadBomEntries();
this.toastService.show('Semi-finished components registered.');

      this.modalOpen = false;

      this.toastService.show('Semi-finished components registered.');
    } catch (error: any) {
      alert(error?.error?.message || 'Error saving operations.');
    }
  }

  // =========================================================
  // Inline Editing
  // =========================================================

  startEdit(entry: any): void {
    const type: BomLineType = entry.semiFinishedId ? 'semi' : 'raw';

    this.editingEntry = {
      id: entry.id,
      type,
      rawMaterialId: entry.rawMaterialId ?? 0,
      semiFinishedId: entry.semiFinishedId ?? 0,
      qty: entry.qtyPerUnit ?? entry.semiFinishedQtyPerUnit ?? 0,
    };
  }

  cancelEdit(): void {
    this.editingEntry = null;
  }

  saveEdit(entry: any): void {
    if (!this.editingEntry) {
      return;
    }

    if (this.editingEntry.qty <= 0) {
      alert('Quantity must be greater than zero.');
      return;
    }

    if (this.definitionTab === 'finished') {
      this.saveFinishedProductEdit();
      return;
    }

    this.saveSemiFinishedEdit();
  }

  private saveFinishedProductEdit(): void {
    if (!this.editingEntry) {
      return;
    }

    if (this.editingEntry.type === 'raw' && !this.editingEntry.rawMaterialId) {
      alert('Please select a Raw Material.');
      return;
    }

    if (this.editingEntry.type === 'semi' && !this.editingEntry.semiFinishedId) {
      alert('Please select a Semi-Finished product.');
      return;
    }

    const payload =
      this.editingEntry.type === 'raw'
        ? {
            rawMaterialId: this.editingEntry.rawMaterialId,

            semiFinishedId: null, // كان 0

            qtyPerUnit: this.editingEntry.qty,
          }
        : {
            rawMaterialId: null, // كان 0

            semiFinishedId: this.editingEntry.semiFinishedId,

            qtyPerUnit: this.editingEntry.qty,
          };

    this.bomService.updateBomEntry(this.editingEntry.id, payload).subscribe({
      next: () => {
        this.loadBomEntries();

        this.cancelEdit();

        this.toastService.show('BOM item record altered.');
      },
      error: (error) => {
        alert(error?.error?.message || 'Update failed.');
      },
    });
  }

  private saveSemiFinishedEdit(): void {
    if (!this.editingEntry) {
      return;
    }

    if (!this.editingEntry.rawMaterialId) {
      alert('Please select a Raw Material.');
      return;
    }

    this.bomService
      .updateSemiFinishedEntry(this.editingEntry.id, {
        rawMaterialId: this.editingEntry.rawMaterialId,

        qtyPerUnit: this.editingEntry.qty,
      })
      .subscribe({
        next: () => {
          this.loadBomEntries();

          this.cancelEdit();

          this.toastService.show('Sub-blueprint updated.');
        },
        error: (error) => {
          alert(error?.error?.message || 'Update failed.');
        },
      });
  }

  // =========================================================
  // Delete
  // =========================================================

  deleteEntry(entry: any): void {
    const confirmed = confirm('Remove this allocation layer from the item design?');

    if (!confirmed) {
      return;
    }

    const action$ =
      this.definitionTab === 'finished'
        ? this.bomService.deleteBomEntry(entry.id)
        : this.bomService.deleteSemiFinishedEntry(entry.id);

    action$.subscribe({
      next: () => {
        this.loadBomEntries();

        this.toastService.show('Layer entry removed.');
      },
      error: (error) => {
        alert(error?.error?.message || 'Deletion rejected.');
      },
    });
  }

  // =========================================================
  // Work Order Consumption
  // =========================================================

  onWorkOrderChange(): void {
    const workOrderId = Number(this.consumeForm.woId);

    const selectedWorkOrder = this.workOrderService
      .WorkOrders()
      .find((workOrder) => workOrder.id === workOrderId);

    this.consumeForm.qty = selectedWorkOrder
      ? selectedWorkOrder.plannedQty - (selectedWorkOrder.producedQty || 0)
      : null;

    const warehouses = this.masterData.WAREHOUSES();

    this.consumeForm.rawWarehouseId =
      warehouses.find((warehouse) => warehouse.typeName === 'RawMaterial')?.id ?? 5;

    this.consumeForm.finishedWarehouseId =
      warehouses.find((warehouse) => warehouse.typeName === 'FinishedGoods')?.id ?? 9;

    this.loadConsumeItems();
  }

  loadConsumeItems(): void {
    const workOrderId = Number(this.consumeForm.woId);
    const quantity = Number(this.consumeForm.qty) || 0;

    this.consumePreview = [];
    this.previewError = '';

    if (!workOrderId || quantity <= 0) return;

    this.previewLoading.set(true);

    this.workOrderService
      .previewConsumption(workOrderId, quantity)
      .pipe(finalize(() => this.previewLoading.set(false)))
      .subscribe({
        next: (data) => {
          this.consumePreview = data.map((item: any) => ({
            name: item.rawMaterialName || item.semiFinishedName,
            need: item.requiredQty,
            unit: item.unit,
            have: item.availableQty,
            ok: item.isSufficient,
          }));
        },
        error: (error) => {
          this.previewError = error?.error?.message || 'Unable to preview BOM consumption.';
        },
      });
  }
  postConsumption(): void {
    const form = this.consumeForm;

    const workOrderId = Number(form.woId);

    if (!workOrderId || !form.qty || form.qty <= 0) {
      alert('Please cross-verify inputs first.');
      return;
    }

    const confirmed = confirm(`Complete WO ${form.woId} and post consumption details?`);

    if (!confirmed) {
      return;
    }

    this.posting.set(true);

    this.workOrderService
      .completeWorkOrder(workOrderId, {
        producedQty: Number(form.qty),
        rawMaterialWarehouseId: form.rawWarehouseId,
        finishedGoodsWarehouseId: form.finishedWarehouseId,
        productionDate: form.productionDate,
      })
      .pipe(finalize(() => this.posting.set(false)))
      .subscribe({
        next: () => {
          this.workOrderService.refreshAfterCompletion();

          this.consumeForm = {
            woId: 0,
            qty: null,
            rawWarehouseId: 5,
            finishedWarehouseId: 9,
            productionDate: this.workOrderService.today,
          };

          this.consumePreview = [];

          this.toastService.show('Consumption successfully cataloged.');

          this.router.navigate(['/serials'], {
            queryParams: {
              type: 'wo',
              id: String(workOrderId),
            },
          });
        },
        error: (error) => {
          alert(error?.error?.message || 'Consumption posting failed.');
        },
      });
  }
}
