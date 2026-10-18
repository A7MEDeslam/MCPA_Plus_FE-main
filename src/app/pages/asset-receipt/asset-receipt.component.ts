import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AssetPurchaseOrderService } from '../../services/asset-purchase-order.service';
import { AssetReceiptService } from '../../services/asset-receipt.service';
import { MasterDataService } from '../../services/master-data.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { SearchableSelectComponent, SelectOption } from '../../components/searchable-select/searchable-select.component';
import { AssetReceiptDetailsDto } from '../../models/asset-procurement.dto';

interface ArItemRow {
  assetPurchaseOrderItemId: number;
  assetAccountNo: string;
  assetName: string;
  orderedQty: number;
  receivedQty: number;
  remainingQty: number;
  qtyToReceive: number;
}

@Component({
  selector: 'app-asset-receipt',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, SearchableSelectComponent],
  templateUrl: './asset-receipt.component.html',
  styleUrl: './asset-receipt.component.css'
})
export class AssetReceiptComponent implements OnInit {
  apoService = inject(AssetPurchaseOrderService);
  arService = inject(AssetReceiptService);
  masterData = inject(MasterDataService);
  toastService = inject(ToastService);
  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  get canCreate() { return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin']); }

  pagination = useDynamicPagination();
  arSearch = signal('');

  filteredARs = computed(() => {
    const term = this.arSearch().toLowerCase().trim();
    return this.arService.ARs().filter(g =>
      !term || [g.arNumber, g.poNumber, g.warehouseName, g.receivedBy, g.status].join(' ').toLowerCase().includes(term)
    );
  });

  pagedARs = computed(() => {
    const data = this.filteredARs();
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  openPOsForAR = computed(() =>
    this.apoService.POs().filter(p => p.status === 'Approved' || p.status === 'Partial')
  );

  poOptions = computed((): SelectOption[] =>
    this.openPOsForAR().map(p => ({ value: p.id, label: `${p.poNumber} (${p.supplierName})` }))
  );

  warehouseOptions = computed((): SelectOption[] =>
    this.masterData.WAREHOUSES().map(w => ({ value: w.id, label: `${w.name} (${w.typeName})` }))
  );

  // Type 4 = AssetWarehouse
  private get assetWarehouseId(): string {
    const wh = this.masterData.WAREHOUSES().find(w => w.type === 4);
    return wh ? String(wh.id) : '';
  }

  get assetWarehouseName(): string {
    const wh = this.masterData.WAREHOUSES().find(w => w.type === 4);
    return wh ? `${wh.name} (${wh.typeName})` : '';
  }

  selectedARDetails: AssetReceiptDetailsDto | null = null;
  arDetailsOpen = false;

  modalOpen = false;
  arForm = { poRef: '', date: this.apoService.today, by: '' };
  arItems: ArItemRow[] = [];

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const poRef = params['poRef'];
      if (poRef) {
        this.applyPoRef(String(poRef));
      }
    });
  }

  private applyPoRef(poRef: string) {
    this.arForm.poRef = poRef;
    this.fillARFromPO();
    this.modalOpen = true;
  }

  openModal() {
    this.arForm = { poRef: '', date: this.apoService.today, by: '' };
    this.arItems = [];
    this.modalOpen = true;
  }

  showARDetails(id: number) {
    this.arService.getDetails(id).subscribe({
      next: (data) => {
        this.selectedARDetails = data;
        this.arDetailsOpen = true;
      },
      error: (err) => {
        console.error('Failed to load asset receipt details:', err);
        this.toastService.show('Failed to load asset receipt details.');
      }
    });
  }

  closeModal() {
    this.modalOpen = false;
    this.router.navigate([], { queryParams: { poRef: null }, queryParamsHandling: 'merge' });
  }

  closeModalIfOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  fillARFromPO() {
    const poId = this.arForm.poRef;
    if (!poId) {
      this.arItems = [];
      return;
    }

    this.apoService.getDetails(Number(poId)).subscribe({
      next: (po) => {
        this.arItems = (po.items || []).map(item => {
          const remaining = item.remainingQty ?? (item.orderedQty - (item.receivedQty ?? 0));
          return {
            assetPurchaseOrderItemId: item.id,
            assetAccountNo: item.assetAccountNo,
            assetName: item.assetName,
            orderedQty: item.orderedQty,
            receivedQty: item.receivedQty ?? 0,
            remainingQty: remaining,
            qtyToReceive: remaining
          };
        });
      },
      error: (err) => {
        console.error('Failed to load asset PO details:', err);
        this.toastService.show('Failed to load purchase order details.');
      }
    });
  }

  saveAR() {
    const f = this.arForm;
    const warehouseId = this.assetWarehouseId;
    if (!f.poRef || !warehouseId || !f.date || !f.by) {
      if (!warehouseId) return alert('No Asset Warehouse (type 4) is configured. Please configure one first.');
      return alert('Please fill in all required fields (PO Reference, Date, and Received By).');
    }

    const itemsToReceive = this.arItems
      .filter(item => item.qtyToReceive > 0)
      .map(item => ({
        assetPurchaseOrderItemId: item.assetPurchaseOrderItemId,
        receivedQty: Number(item.qtyToReceive)
      }));

    if (itemsToReceive.length === 0) {
      return alert('Please specify a received quantity greater than 0 for at least one item.');
    }

    const payload = {
      assetPurchaseOrderId: Number(f.poRef),
      warehouseId: Number(warehouseId),
      receiptDate: new Date(f.date).toISOString(),
      receivedBy: f.by,
      items: itemsToReceive
    };

    this.arService.createAR(payload).subscribe({
      next: () => {
        this.toastService.show('Asset Receipt recorded successfully!');
        this.closeModal();
        this.arForm = { poRef: '', date: this.apoService.today, by: '' };
        this.arItems = [];
        this.arService.refreshAll();
      },
      error: (err) => {
        console.error('Failed to create asset receipt:', err);
        const errMsg = err.error?.message || err.message || 'Unknown error';
        alert('Failed to record Asset Receipt: ' + errMsg);
      }
    });
  }
}
