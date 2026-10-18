import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MasterDataService } from '../../services/master-data.service';
import { InventoryService } from '../../services/inventory.service';
import { ProjectService } from '../../services/project.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { SearchableSelectComponent, SelectOption } from '../../components/searchable-select/searchable-select.component';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-third-warehouse',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, SearchableSelectComponent],
  templateUrl: './third-warehouse.component.html',
  styleUrls: ['./third-warehouse.component.css']
})
export class ThirdWarehouseComponent {
  masterData = inject(MasterDataService);
  inventory = inject(InventoryService);
  projectService = inject(ProjectService);
  toastService = inject(ToastService);
  authService = inject(AuthService);

  get canAssign() { return this.authService.hasAnyRole(['CEO', 'Engineer', 'Technician','Admin']); }

  pagination = useDynamicPagination();
  assignOpen = false;
  isAssigning = false;
  stockSearch = signal('');
  assignForm = { rawMaterialId: 0, projectId: 0, fromWarehouseId: 0, quantity: 0, notes: '' };

  thirdWarehouse = computed(() =>
    this.masterData.WAREHOUSES().find(
      w => w.typeName === 'ThirdWarehouse' || /third/i.test(w.name)
    )
  );

  thirdWarehouseId = computed(() => this.thirdWarehouse()?.id ?? 0);
  thirdWarehouseName = computed(() => this.thirdWarehouse()?.name ?? 'Third Warehouse');

  thirdWarehouseAssignments = computed(() => {
    const warehouseId = this.thirdWarehouseId();
    if (!warehouseId) {
      return [];
    }

    return this.masterData.PROJECT_ASSIGNMENTS()
      .filter(a => a.toWarehouseId === warehouseId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  thirdWarehouseStockItems = computed(() => {
    const warehouseId = this.thirdWarehouseId();
    if (!warehouseId) {
      return [];
    }

    return this.inventory.RawMaterials().filter((item: any) =>
      item.warehouseId === warehouseId ||
      item.warehouseName === this.thirdWarehouseName() ||
      item.toWarehouseId === warehouseId
    );
  });

  thirdWarehouseRows = computed(() => {
    const term = this.stockSearch().toLowerCase().trim();
    const stockItems = this.thirdWarehouseStockItems();
    let rows: any[];

    if (stockItems.length) {
      rows = stockItems.map((item: any) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        quantity: item.currentStock ?? item.quantity ?? 0,
        minStock: item.minStockLevel ?? item.minStock,
        projectName: item.projectName ?? '',
        fromWarehouse: item.fromWarehouse || item.warehouseName || '',
        assignedAt: item.lastReceiptDate || item.createdAt || ''
      }));
    } else {
      rows = this.thirdWarehouseAssignments().map(a => ({
        id: a.rawMaterialId,
        code: a.rawMaterialCode,
        name: a.rawMaterialName,
        unit: '',
        quantity: a.quantity,
        minStock: undefined,
        projectName: a.projectName,
        fromWarehouse: a.fromWarehouse,
        assignedAt: a.createdAt
      }));
    }

    if (!term) return rows;
    return rows.filter(r =>
      [r.code, r.name, r.projectName, r.fromWarehouse].join(' ').toLowerCase().includes(term)
    );
  });

  rawMaterialOptions = computed((): SelectOption[] =>
    this.availableRawMaterials().map(m => ({ value: m.id, label: `${m.code ? m.code + ' - ' : ''}${m.name}` }))
  );

  projectOptions = computed((): SelectOption[] =>
    this.projectService.Projects().map(p => ({ value: p.id, label: p.name }))
  );

  warehouseOptions = computed((): SelectOption[] =>
    this.masterData.WAREHOUSES().map(w => ({ value: w.id, label: `${w.name} (${w.typeName})` }))
  );

  pagedRows = computed(() => {
    const rows = this.thirdWarehouseRows();
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return rows.slice((page - 1) * size, page * size);
  });

  totalQuantity = computed(() => this.thirdWarehouseRows().reduce((sum: number, row: any) => sum + (row.quantity ?? 0), 0));

  availableRawMaterials = computed(() => this.masterData.RAW_ITEMS());

  openAssign() {
    const warehouses = this.masterData.WAREHOUSES();
    this.assignForm.rawMaterialId = this.availableRawMaterials()[0]?.id ?? 0;
    this.assignForm.projectId = this.projectService.Projects()[0]?.id ?? 0;
    this.assignForm.fromWarehouseId = warehouses.find(w => w.typeName === 'RawMaterial')?.id ?? warehouses[0]?.id ?? 0;
    this.assignForm.quantity = 0;
    this.assignForm.notes = '';
    this.assignOpen = true;
  }

  submitAssign() {
    if (this.isAssigning) return;
    const warehouseId = this.thirdWarehouseId();
    if (!warehouseId) {
      return alert('Third warehouse is not configured yet.');
    }

    const payload = {
      rawMaterialId: Number(this.assignForm.rawMaterialId),
      projectId: Number(this.assignForm.projectId),
      fromWarehouseId: Number(this.assignForm.fromWarehouseId),
      toWarehouseId: warehouseId,
      quantity: Number(this.assignForm.quantity),
      notes: this.assignForm.notes || undefined
    };

    this.isAssigning = true;
    this.masterData.assignMaterialToProject(payload).pipe(
      finalize(() => this.isAssigning = false)
    ).subscribe({
      next: () => {
        this.toastService.show('Material assigned to Third Warehouse.');
        this.assignOpen = false;
      },
      error: err => console.error('Failed to assign material to Third Warehouse', err)
    });
  }
}
