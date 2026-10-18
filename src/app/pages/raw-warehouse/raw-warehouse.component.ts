import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MasterDataService } from '../../services/master-data.service';
import { PurchaseOrderService } from '../../services/purchase-order.service';
import { ProductionService } from '../../services/production.service';
import { GoodsReceiptService } from '../../services/goods-receipt.service';
import { InventoryService } from '../../services/inventory.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-raw-warehouse',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './raw-warehouse.component.html',
  styleUrl: './raw-warehouse.component.css'
})
export class RawWarehouseComponent {
  masterData = inject(MasterDataService);
  poService = inject(PurchaseOrderService);
  prodService = inject(ProductionService);
  grService = inject(GoodsReceiptService);
  inventory = inject(InventoryService);
  authService = inject(AuthService);
  toastService = inject(ToastService);

  pagination = useDynamicPagination();
  stockSearch = signal('');
  addMaterialOpen = false;
  materialSaving = false;
  materialNameQuery = signal('');
  materialForm = { code: '', name: '', unit: '', minStockLevel: 0, links: [{ url: '', label: '' }] };
  editMaterialOpen = false;
  editingMaterial: any = null;

  get canCreateMaterial() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin']);
  }

  private normalizeMaterialName(value: string): string {
    return value.toLowerCase().replace(/[\-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  materialNameMatches = computed(() => {
    const query = this.normalizeMaterialName(this.materialNameQuery());
    if (!query) return [];
    return this.masterData.RAW_ITEMS()
      .filter((item: any) => this.normalizeMaterialName(item.name || '').includes(query))
      .slice(0, 5);
  });

  exactMaterialMatch = computed(() => {
    const query = this.normalizeMaterialName(this.materialNameQuery());
    if (!query) return null;
    return this.masterData.RAW_ITEMS().find((item: any) => this.normalizeMaterialName(item.name || '') === query) ?? null;
  });

  totalUnits = computed(() => this.inventory.RawMaterials().reduce((a: any, i: any) => a + (i.currentStock || 0), 0));
  lowRMs = computed(() => this.inventory.RawMaterials().filter((i: any) => (i.currentStock || 0) < i.minStockLevel).length);

  rawStockValues = computed(() => {
    const term = this.stockSearch().toLowerCase().trim();
    const filtered = this.inventory.RawMaterials()
      .filter((i: any) => !term || [i.code, i.name, i.unit, i.stockStatus, i.stockStatusMessage].join(' ').toLowerCase().includes(term));
    return [...filtered]
      .sort((a: any, b: any) => (b.currentStock ?? 0) - (a.currentStock ?? 0))
      .map((i: any) => {
      const qty = i.currentStock ?? 0;
      const lastDate = i.lastReceiptDate ?? '-';
      const pct = Math.min(100, Math.round((i.stockCoveragePercent ?? 0)));

      const statusClass = (i.stockStatus || '').toLowerCase();
      const color = i.stockStatus === 'OutOfStock' || i.stockStatus === 'BelowMinimum' ? '#e74c3c' : (i.stockStatus === 'LowStock' ? '#f39c12' : '#27ae60');
      const label = ({
        OutOfStock: 'Out of stock',
        BelowMinimum: 'Below minimum',
        LowStock: 'Low stock',
        HealthyStock: 'In stock',
      } as Record<string, string>)[i.stockStatus] || 'Unknown';

      return { id: i.id, code: i.code, name: i.name, unit: i.unit, qty, lastDate, pct, minStock: i.minStockLevel, status: statusClass, color, label, shortage: i.shortageQty, safetyTarget: i.safetyStockTarget };
    });
  });

  pagedStockValues = computed(() => {
    const data = this.rawStockValues();
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  openAddMaterial() {
    this.materialForm = { code: '', name: '', unit: '', minStockLevel: 0, links: [{ url: '', label: '' }] };
    this.materialNameQuery.set('');
    this.addMaterialOpen = true;
  }

  closeAddMaterial() {
    if (!this.materialSaving) this.addMaterialOpen = false;
  }

  saveMaterial() {
    const form = this.materialForm;
    const validLinks = form.links.filter(link => link.url.trim());
    if (!form.name.trim() || !form.unit.trim() || !validLinks.length || validLinks.some(link => !this.isValidHttpUrl(link.url)) || Number(form.minStockLevel) < 0 || this.materialSaving || this.exactMaterialMatch()) return;

    this.materialSaving = true;
    this.masterData.createRawMaterial({
      code: form.code.trim().toUpperCase() || undefined,
      name: form.name.trim(),
      unit: form.unit.trim(),
      minStockLevel: Number(form.minStockLevel),
      links: validLinks.map(link => ({ url: link.url.trim(), label: link.label.trim() || undefined })),
      suppliers: [],
    }).subscribe({
      next: () => {
        this.inventory.fetchRawMaterials();
        this.addMaterialOpen = false;
        this.materialSaving = false;
        this.toastService.show('Raw material added successfully.');
      },
      error: (err) => {
        this.materialSaving = false;
        alert(err?.error?.message || 'Could not add raw material.');
      },
    });
  }

  openMaterialEdit(material: any) {
    this.editingMaterial = material;
    this.materialForm = {
      code: material.code || '',
      name: material.name || '',
      unit: material.unit || '',
      minStockLevel: Number(material.minStock ?? 0),
      links: [],
    };
    this.editMaterialOpen = true;
  }

  closeMaterialEdit() {
    if (!this.materialSaving) {
      this.editMaterialOpen = false;
      this.editingMaterial = null;
    }
  }

  saveMaterialEdit() {
    const material = this.editingMaterial;
    const form = this.materialForm;
    if (!material || !form.name.trim() || !form.unit.trim() || Number(form.minStockLevel) < 0 || this.materialSaving) return;

    this.materialSaving = true;
    this.masterData.updateRawMaterial(material.id, {
      code: material.code || undefined,
      name: form.name.trim(),
      unit: form.unit.trim(),
      minStockLevel: Number(form.minStockLevel),
    }).subscribe({
      next: () => {
        this.inventory.fetchRawMaterials();
        this.editMaterialOpen = false;
        this.editingMaterial = null;
        this.materialSaving = false;
        this.toastService.show('Raw material updated successfully.');
      },
      error: (err) => {
        this.materialSaving = false;
        alert(err?.error?.message || 'Could not update raw material.');
      },
    });
  }

  onMaterialNameInput(value: string) {
    this.materialForm.name = value;
    this.materialNameQuery.set(value);
  }

  normalizeMaterialNameInput() {
    this.materialForm.name = this.materialForm.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
    this.materialNameQuery.set(this.materialForm.name);
  }

  chooseMaterialSuggestion(name: string) {
    this.materialForm.name = name;
    this.materialNameQuery.set(name);
  }

  addMaterialLink() {
    this.materialForm.links.push({ url: '', label: '' });
  }

  removeMaterialLink(index: number) {
    if (this.materialForm.links.length === 1) {
      this.materialForm.links[0] = { url: '', label: '' };
      return;
    }
    this.materialForm.links.splice(index, 1);
  }

  isValidHttpUrl(value: string): boolean {
    try {
      const url = new URL(value.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  hasValidMaterialLink(): boolean {
    return this.materialForm.links.some(link => this.isValidHttpUrl(link.url));
  }
}
