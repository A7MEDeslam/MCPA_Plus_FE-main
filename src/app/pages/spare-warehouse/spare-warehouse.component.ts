import { Component, OnInit, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpareWarehouseService } from '../../services/spare-warehouse.service';
import { MasterDataService } from '../../services/master-data.service';
import { ProjectService } from '../../services/project.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { SearchableSelectComponent, SelectOption } from '../../components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-spare-warehouse',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, SearchableSelectComponent],
  templateUrl: './spare-warehouse.component.html',
  styleUrls: ['./spare-warehouse.component.css']
})
export class SpareWarehouseComponent implements OnInit {
  spareService = inject(SpareWarehouseService);
  masterData = inject(MasterDataService);
  projectService = inject(ProjectService);
  toastService = inject(ToastService);
  authService = inject(AuthService);

  selectedWarehouseId = signal<number | null>(null);

  constructor() {
    effect(() => {
      const allWhs = this.masterData.WAREHOUSES();
      console.log('[SpareWarehouse] All warehouses from API:', allWhs.map(w => ({ id: w.id, name: w.name, type: w.type, typeName: w.typeName })));
      const whs = this.spareWarehouses();
      console.log('[SpareWarehouse] Filtered spare warehouses:', whs);
      if (whs.length > 0) {
        const currentId = this.selectedWarehouseId();
        if (currentId === null || !whs.some(w => w.id === currentId)) {
          setTimeout(() => {
            this.selectWarehouse(whs[0].id);
          });
        }
      }
    });
  }

  pagination = useDynamicPagination();
  historySearch = signal('');

  // Form State
  returnForm = {
    projectId: 0,
    rawMaterialId: 0,
    quantity: 0,
    notes: ''
  };

  // Roles allowed to return material
  get canReturn() {
    return this.authService.hasAnyRole(['CEO', 'Engineer', 'Technician', 'Admin', 'Accountant']);
  }

  // Spare Warehouses list — filter strictly by typeName only
  spareWarehouses = computed(() =>
    this.masterData.WAREHOUSES().filter(w =>
      w.typeName === 'Spare' ||
      w.typeName === 'SpareWarehouse' ||
      w.typeName === 'Spare Warehouse'
    )
  );

  // Selected warehouse object
  activeWarehouse = computed(() =>
    this.spareWarehouses().find(w => w.id === this.selectedWarehouseId()) || null
  );

  // Search options
  rawMaterialOptions = computed((): SelectOption[] =>
    this.masterData.RAW_ITEMS().map(m => ({
      value: m.id,
      label: `${m.code ? m.code + ' - ' : ''}${m.name}`
    }))
  );

  projectOptions = computed((): SelectOption[] =>
    this.projectService.Projects().map(p => ({
      value: p.id,
      label: p.name
    }))
  );

  // Filtered and sorted history
  filteredHistory = computed(() => {
    const term = this.historySearch().toLowerCase().trim();
    const list = this.spareService.history();
    const sorted = [...list].sort((a, b) => new Date(b.returnedAt).getTime() - new Date(a.returnedAt).getTime());
    if (!term) return sorted;
    return sorted.filter(h =>
      h.materialName.toLowerCase().includes(term) ||
      h.materialCode.toLowerCase().includes(term) ||
      (h.notes && h.notes.toLowerCase().includes(term)) ||
      String(h.projectId).includes(term)
    );
  });

  pagedHistory = computed(() => {
    const data = this.filteredHistory();
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  ngOnInit() {
    this.masterData.fetchWarehouses();
    this.masterData.fetchRawMaterials();
    this.projectService.fetchAll();
  }

  selectWarehouse(id: any) {
    const numericId = Number(id);
    this.selectedWarehouseId.set(numericId);
    this.spareService.fetchHistory(numericId);
    this.pagination.resetPage();
    this.resetForm();
  }

  resetForm() {
    const defaultProj = this.projectService.Projects()[0]?.id ?? 0;
    const defaultMaterial = this.masterData.RAW_ITEMS()[0]?.id ?? 0;
    this.returnForm = {
      projectId: defaultProj,
      rawMaterialId: defaultMaterial,
      quantity: 0,
      notes: ''
    };
  }

  getProjectName(id: number): string {
    const proj = this.projectService.Projects().find(p => p.id === id);
    return proj ? proj.name : `Project #${id}`;
  }

  submitReturn() {
    const whId = this.selectedWarehouseId();
    if (!whId) return alert('No warehouse selected.');

    const f = this.returnForm;
    if (!f.projectId) return alert('Select a project.');
    if (!f.rawMaterialId) return alert('Select a raw material.');
    if (f.quantity <= 0) return alert('Quantity must be greater than zero.');

    this.spareService.returnSpare({
      warehouseId: whId,
      rawMaterialId: Number(f.rawMaterialId),
      projectId: Number(f.projectId),
      quantity: Number(f.quantity),
      notes: f.notes || undefined
    }).subscribe({
      next: () => {
        this.toastService.show('Material returned successfully and main stock updated.');
        this.masterData.fetchRawMaterials(); // Update raw stock levels everywhere
        this.resetForm();
      },
      error: (err) => {
        console.error('Failed to submit spare return:', err);
        alert(err?.error?.message || 'Failed to submit spare return.');
      }
    });
  }
}
