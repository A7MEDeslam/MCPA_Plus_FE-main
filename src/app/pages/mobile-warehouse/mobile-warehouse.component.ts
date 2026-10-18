import { Component, OnInit, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileWarehouseService } from '../../services/mobile-warehouse.service';
import { MasterDataService } from '../../services/master-data.service';
import { SerialNumberService } from '../../services/serial-number.service';
import { ProjectService } from '../../services/project.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { SearchableSelectComponent, SelectOption } from '../../components/searchable-select/searchable-select.component';
import { MobileWarehouseActionType } from '../../models/mobile-warehouse.dto';

@Component({
  selector: 'app-mobile-warehouse',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, SearchableSelectComponent],
  templateUrl: './mobile-warehouse.component.html',
  styleUrls: ['./mobile-warehouse.component.css']
})
export class MobileWarehouseComponent implements OnInit {
  mwService = inject(MobileWarehouseService);
  masterData = inject(MasterDataService);
  serialService = inject(SerialNumberService);
  projectService = inject(ProjectService);
  toastService = inject(ToastService);
  authService = inject(AuthService);

  activeTab = signal<'items' | 'serials' | 'history'>('items');
  selectedWarehouseId = signal<number | null>(null);

  constructor() {
    effect(() => {
      const whs = this.mobileWarehouses();
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

  // Pagination for all tabs
  itemPagination = useDynamicPagination();
  serialPagination = useDynamicPagination();
  historyPagination = useDynamicPagination();

  // Search terms
  itemSearch = signal('');
  serialSearch = signal('');
  historySearch = signal('');

  // Role permissions
  get canManage() {
    return this.authService.hasAnyRole(['CEO', 'Engineer', 'Admin', 'Accountant']);
  }

  // Mobile Warehouses list — filter strictly by typeName only
  mobileWarehouses = computed(() =>
    this.masterData.WAREHOUSES().filter(w =>
      w.typeName === 'Mobile' ||
      w.typeName === 'MobileWarehouse' ||
      w.typeName === 'Mobile Warehouse'
    )
  );

  // Selected warehouse object
  activeWarehouse = computed(() =>
    this.mobileWarehouses().find(w => w.id === this.selectedWarehouseId()) || null
  );

  // Modal / Form state
  assignItemModalOpen = false;
  assignSerialsModalOpen = false;
  itemActionModalOpen = false;
  serialActionModalOpen = false;

  // Forms
  assignItemForm = {
    rawMaterialId: 0,
    quantity: 0
  };

  selectedSerialIds = signal<number[]>([]);
  serialSearchFilter = signal('');

  activeItemAction: {
    item: any;
    actionType: MobileWarehouseActionType;
    quantity: number;
    projectId?: number;
    notes?: string;
  } | null = null;

  activeSerialAction: {
    serial: any;
    actionType: MobileWarehouseActionType;
    projectId?: number;
    notes?: string;
  } | null = null;

  // Available options for selects
  rawMaterialOptions = computed((): SelectOption[] =>
    this.masterData.RAW_ITEMS().map(m => ({
      value: m.id,
      label: `${m.code ? m.code + ' - ' : ''}${m.name} (Available: ${m.currentStock} ${m.unit})`
    }))
  );

  projectOptions = computed((): SelectOption[] =>
    this.projectService.Projects().map(p => ({
      value: p.id,
      label: p.name
    }))
  );

  // Filtered available serials in main stock
  availableSerials = computed(() => {
    const term = this.serialSearchFilter().toLowerCase().trim();
    const instock = this.serialService.Serials().filter(s => s.status === 'InStock' || s.status === 'In Stock' || s.status === 1);
    if (!term) return instock;
    return instock.filter(s =>
      s.serial.toLowerCase().includes(term) ||
      (s.productName && s.productName.toLowerCase().includes(term))
    );
  });

  // Items currently inside selected mobile warehouse (filtered + paged)
  filteredItems = computed(() => {
    const term = this.itemSearch().toLowerCase().trim();
    const list = this.mwService.items();
    if (!term) return list;
    return list.filter(i =>
      i.rawMaterialName.toLowerCase().includes(term) ||
      i.rawMaterialCode.toLowerCase().includes(term)
    );
  });

  pagedItems = computed(() => {
    const data = this.filteredItems();
    const page = this.itemPagination.currentPage();
    const size = this.itemPagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  // Serials currently inside selected mobile warehouse (filtered + paged)
  filteredSerials = computed(() => {
    const term = this.serialSearch().toLowerCase().trim();
    const list = this.mwService.serials();
    if (!term) return list;
    return list.filter(s =>
      s.serial.toLowerCase().includes(term) ||
      s.productName.toLowerCase().includes(term)
    );
  });

  pagedSerials = computed(() => {
    const data = this.filteredSerials();
    const page = this.serialPagination.currentPage();
    const size = this.serialPagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  // History tab (filtered + paged)
  filteredHistory = computed(() => {
    const term = this.historySearch().toLowerCase().trim();
    const list = this.mwService.history();
    if (!term) return list;
    return list.filter(h =>
      h.materialName.toLowerCase().includes(term) ||
      h.materialCode.toLowerCase().includes(term) ||
      h.transactionType.toLowerCase().includes(term) ||
      (h.projectName && h.projectName.toLowerCase().includes(term)) ||
      (h.notes && h.notes.toLowerCase().includes(term))
    );
  });

  pagedHistory = computed(() => {
    const data = this.filteredHistory();
    const page = this.historyPagination.currentPage();
    const size = this.historyPagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  ngOnInit() {
    this.masterData.fetchWarehouses();
    this.masterData.fetchRawMaterials();
    this.serialService.fetchAll();
    this.projectService.fetchAll();
  }

  selectWarehouse(id: any) {
    const numericId = Number(id);
    this.selectedWarehouseId.set(numericId);
    this.mwService.fetchItems(numericId);
    this.mwService.fetchSerials(numericId);
    this.mwService.fetchHistory(numericId);
    this.itemPagination.resetPage();
    this.serialPagination.resetPage();
    this.historyPagination.resetPage();
  }

  setTab(tab: 'items' | 'serials' | 'history') {
    this.activeTab.set(tab);
  }

  // ASSIGN MATERIAL FLOW
  openAssignItem() {
    const list = this.masterData.RAW_ITEMS();
    this.assignItemForm = {
      rawMaterialId: list[0]?.id ?? 0,
      quantity: 0
    };
    this.assignItemModalOpen = true;
  }

  closeAssignItem() {
    this.assignItemModalOpen = false;
  }

  submitAssignItem() {
    const whId = this.selectedWarehouseId();
    if (!whId) return alert('No warehouse selected.');

    const f = this.assignItemForm;
    if (!f.rawMaterialId) return alert('Select a raw material.');
    if (f.quantity <= 0) return alert('Quantity must be greater than zero.');

    const material = this.masterData.RAW_ITEMS().find(m => m.id === f.rawMaterialId);
    if (material && material.currentStock < f.quantity) {
      return alert(`Insufficient stock. Available: ${material.currentStock} ${material.unit}.`);
    }

    this.mwService.assignItem({
      warehouseId: whId,
      rawMaterialId: Number(f.rawMaterialId),
      quantity: Number(f.quantity)
    }).subscribe({
      next: () => {
        this.toastService.show('Raw material assigned to mobile warehouse successfully.');
        this.masterData.fetchRawMaterials();
        this.assignItemModalOpen = false;
      },
      error: (err) => {
        console.error('Failed to assign item:', err);
        alert(err?.error?.message || 'Failed to assign item to mobile warehouse.');
      }
    });
  }

  // ASSIGN SERIALS FLOW
  openAssignSerials() {
    this.selectedSerialIds.set([]);
    this.serialSearchFilter.set('');
    this.serialService.fetchAll();
    this.assignSerialsModalOpen = true;
  }

  closeAssignSerials() {
    this.assignSerialsModalOpen = false;
  }

  toggleSerialSelection(id: number) {
    const current = this.selectedSerialIds();
    if (current.includes(id)) {
      this.selectedSerialIds.set(current.filter(x => x !== id));
    } else {
      this.selectedSerialIds.set([...current, id]);
    }
  }

  toggleAllVisibleSerials(event: any) {
    const checked = event.target.checked;
    if (checked) {
      const ids = this.availableSerials().map(s => s.id);
      this.selectedSerialIds.set(ids);
    } else {
      this.selectedSerialIds.set([]);
    }
  }

  submitAssignSerials() {
    const whId = this.selectedWarehouseId();
    if (!whId) return alert('No warehouse selected.');

    const ids = this.selectedSerialIds();
    if (ids.length === 0) return alert('Select at least one serial number.');

    this.mwService.assignSerials({
      warehouseId: whId,
      serialIds: ids
    }).subscribe({
      next: () => {
        this.toastService.show(`${ids.length} serials assigned successfully.`);
        this.serialService.fetchAll();
        this.assignSerialsModalOpen = false;
      },
      error: (err) => {
        console.error('Failed to assign serials:', err);
        alert(err?.error?.message || 'Failed to assign serials to mobile warehouse.');
      }
    });
  }

  // ITEM ACTION FLOW (Assign to project / return to stock)
  openItemAction(item: any, type: 'project' | 'stock') {
    const actType = type === 'project' ? MobileWarehouseActionType.AssignedToProject : MobileWarehouseActionType.ReturnedToStock;
    const projects = this.projectService.Projects();
    this.activeItemAction = {
      item,
      actionType: actType,
      quantity: item.quantity,
      projectId: projects[0]?.id ?? undefined,
      notes: ''
    };
    this.itemActionModalOpen = true;
  }

  closeItemAction() {
    this.itemActionModalOpen = false;
    this.activeItemAction = null;
  }

  submitItemAction() {
    const act = this.activeItemAction;
    if (!act) return;

    if (act.quantity <= 0 || act.quantity > act.item.quantity) {
      return alert(`Quantity must be between 0 and ${act.item.quantity}.`);
    }

    if (act.actionType === MobileWarehouseActionType.AssignedToProject && !act.projectId) {
      return alert('Project selection is required.');
    }

    this.mwService.actOnItem({
      mobileWarehouseItemId: act.item.id,
      actionType: act.actionType,
      quantity: Number(act.quantity),
      projectId: act.actionType === MobileWarehouseActionType.AssignedToProject ? Number(act.projectId) : undefined,
      notes: act.notes || undefined
    }).subscribe({
      next: () => {
        this.toastService.show('Action completed successfully.');
        this.masterData.fetchRawMaterials();
        this.closeItemAction();
      },
      error: (err) => {
        console.error('Failed to process item action:', err);
        alert(err?.error?.message || 'Failed to act on mobile warehouse item.');
      }
    });
  }

  // SERIAL ACTION FLOW
  openSerialAction(serial: any, type: 'project' | 'stock') {
    const actType = type === 'project' ? MobileWarehouseActionType.AssignedToProject : MobileWarehouseActionType.ReturnedToStock;
    const projects = this.projectService.Projects();
    this.activeSerialAction = {
      serial,
      actionType: actType,
      projectId: projects[0]?.id ?? undefined,
      notes: ''
    };
    this.serialActionModalOpen = true;
  }

  closeSerialAction() {
    this.serialActionModalOpen = false;
    this.activeSerialAction = null;
  }

  submitSerialAction() {
    const act = this.activeSerialAction;
    if (!act) return;

    if (act.actionType === MobileWarehouseActionType.AssignedToProject && !act.projectId) {
      return alert('Project selection is required.');
    }

    this.mwService.actOnSerial({
      mobileWarehouseSerialId: act.serial.id,
      actionType: act.actionType,
      projectId: act.actionType === MobileWarehouseActionType.AssignedToProject ? Number(act.projectId) : undefined,
      notes: act.notes || undefined
    }).subscribe({
      next: () => {
        this.toastService.show('Serial action completed successfully.');
        this.serialService.fetchAll();
        this.closeSerialAction();
      },
      error: (err) => {
        console.error('Failed to process serial action:', err);
        alert(err?.error?.message || 'Failed to act on mobile warehouse serial.');
      }
    });
  }
}
