import { Component, computed, inject, Input, OnInit , ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { PurchaseOrderService } from '../../services/purchase-order.service';
import { GoodsReceiptService } from '../../services/goods-receipt.service';
import { MasterDataService } from '../../services/master-data.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { SearchableSelectComponent, SelectOption } from '../../components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-goods-receipt',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, SearchableSelectComponent],
  templateUrl: './goods-receipt.component.html',
  styleUrl: './goods-receipt.component.css',
})
export class GoodsReceiptComponent implements OnInit {
  poService = inject(PurchaseOrderService);
  grService = inject(GoodsReceiptService);
  masterData = inject(MasterDataService);
  toastService = inject(ToastService);
  authService = inject(AuthService);
  http = inject(HttpClient);
  router = inject(Router);
  route = inject(ActivatedRoute);
  cdr = inject(ChangeDetectorRef);
  get canCreate() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin']);
  }

  pagination = useDynamicPagination();
  grSearch = '';

  filteredGRs = computed(() => {
    const term = this.grSearch.toLowerCase().trim();
    return this.grService
      .GRs()
      .filter(
        (g) =>
          !term ||
          [g.grNumber, g.poNumber, g.warehouseName, g.receivedBy, g.status]
            .join(' ')
            .toLowerCase()
            .includes(term),
      );
  });

  pagedGRs = computed(() => {
    const data = this.filteredGRs();
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  poOptions = computed((): SelectOption[] =>
    this.openPOsForGR().map((p) => ({ value: p.id, label: `${p.poNumber} (${p.supplierName})` })),
  );

  selectedGRDetails: any = null;
  grDetailsOpen = false;
  grDetailsLoading = false;
  editingActualPriceItemId: number | null = null;
  actualPriceValue: number | null = null;
  savingActualPrice = false;

  defaultWarehouseId = computed(() => {
    const warehouses: any[] = this.masterData.WAREHOUSES();
    return warehouses.find((w) => w.typeName === 'RawMaterial')?.id ?? warehouses[0]?.id ?? 5;
  });

  @Input() set poRef(val: string) {
    if (val) {
      this.applyPoRef(val);
    }
  }

  modalOpen = false;
  grForm = { poRef: '', date: this.poService.today, by: '' };
  grItems: any[] = [];

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const poRef = params['poRef'];
      if (poRef) {
        this.applyPoRef(String(poRef));
      }
    });
  }

  private applyPoRef(poRef: string) {
    this.grForm.poRef = poRef;
    this.fillGRFromPO();
    this.modalOpen = true;
  }

  // Filter open POs to only show those that are Approved or Partial (as per backend logic)
  openPOsForGR = computed(() =>
    this.poService.POs().filter((p) => p.status === 'Approved' || p.status === 'Partial'),
  );

  openModal() {
    this.modalOpen = true;
  }

  showGRDetails(id: number) {
    this.cancelActualPriceEdit();
    const existing = this.grService.GRs().find((g) => g.id === id);
    this.selectedGRDetails = existing || { id };
    this.grDetailsOpen = true;
    this.grDetailsLoading = true;

    this.grService.getById(id).subscribe({
      next: (data) => {
        // Support both the direct DTO and APIs that wrap the DTO in data/result.
        const details: any = (data as any)?.data ?? (data as any)?.result ?? data;
        this.selectedGRDetails = {
          ...(existing || {}),
          ...(details || {}),
          id: details?.id ?? id,
          items: Array.isArray(details?.items) ? details.items : [],
        };
        this.grDetailsLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.grDetailsLoading = false;
        console.error('Failed to load GR details:', err);
        this.toastService.show('Failed to load goods receipt details.');
        this.grDetailsOpen = false;
      },
    });
  }

  closeModal() {
    this.modalOpen = false;
    this.router.navigate([], { queryParams: { poRef: null }, queryParamsHandling: 'merge' });
  }

  closeModalIfOverlay(event: MouseEvent, id?: string) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      if (id === 'modal-gr-details') {
        this.grDetailsOpen = false;
        this.grDetailsLoading = false;
      } else {
        this.closeModal();
      }
    }
  }

  startActualPriceEdit(item: any) {
    this.editingActualPriceItemId = item.id;
    this.actualPriceValue = item.actualUnitPrice ?? null;
  }

  cancelActualPriceEdit() {
    this.editingActualPriceItemId = null;
    this.actualPriceValue = null;
    this.savingActualPrice = false;
  }

  saveActualPrice(item: any) {
    const goodsReceiptId = Number(this.selectedGRDetails?.id);
    const goodsReceiptItemId = Number(item?.id);
    const actualUnitPrice = Number(this.actualPriceValue);

    if (!goodsReceiptId || !goodsReceiptItemId) {
      this.toastService.show('Goods receipt item data is invalid.');
      return;
    }

    if (this.actualPriceValue === null || !Number.isFinite(actualUnitPrice) || actualUnitPrice < 0) {
      this.toastService.show('Please enter a valid actual unit price.');
      return;
    }

    this.savingActualPrice = true;
    this.grService
      .updateActualPrice(goodsReceiptId, goodsReceiptItemId, actualUnitPrice)
      .subscribe({
        next: () => {
          item.actualUnitPrice = actualUnitPrice;
          this.cancelActualPriceEdit();
          this.toastService.show('Actual unit price saved successfully.');
          this.grService.fetchGRs();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to save actual unit price:', err);
          this.savingActualPrice = false;
          const message = err.error?.message || 'Failed to save actual unit price.';
          this.toastService.show(message);
        },
      });
  }

  fillGRFromPO() {
    const poId = this.grForm.poRef;
    if (!poId) {
      this.grItems = [];
      return;
    }

    this.http.get<any>(`${environment.apiUrl}/PurchaseOrders/${poId}`).subscribe({
      next: (po) => {
        this.grItems = (po.items || []).map((item: any) => ({
          purchaseOrderItemId: item.id,
          rawMaterialCode: item.rawMaterialCode,
          rawMaterialName: item.rawMaterialName,
          unit: item.unit,
          orderedQty: item.orderedQty,
          receivedQty: item.receivedQty,
          remainingQty: item.remainingQty,
          qtyToReceive: item.remainingQty,
        }));
      },
      error: (err) => {
        console.error('Failed to load PO details:', err);
        this.toastService.show('Failed to load purchase order details.');
      },
    });
  }

  saveGR() {
    const f = this.grForm;
    if (!f.poRef || !f.date || !f.by) {
      return alert('Please fill in all required fields (PO Reference, Date, and Received By).');
    }

    const itemsToReceive = this.grItems
      .filter((item) => item.qtyToReceive > 0)
      .map((item) => ({
        purchaseOrderItemId: item.purchaseOrderItemId,
        receivedQty: Number(item.qtyToReceive),
      }));

    if (itemsToReceive.length === 0) {
      return alert('Please specify a received quantity greater than 0 for at least one item.');
    }

    const warehouseId = Number(this.defaultWarehouseId());
    if (!warehouseId) {
      return alert('Warehouse data is not available yet. Please try again shortly.');
    }

    const payload = {
      purchaseOrderId: Number(f.poRef),
      warehouseId,
      receiptDate: new Date(f.date).toISOString(),
      receivedBy: f.by,
      items: itemsToReceive,
    };

    this.grService.createGR(payload).subscribe({
      next: () => {
        this.toastService.show('Goods Receipt recorded successfully!');
        this.modalOpen = false;
        this.grForm = { poRef: '', date: this.poService.today, by: '' };
        this.grItems = [];
        this.grService.refreshAll();
      },
      error: (err) => {
        console.error('Failed to create GR:', err);
        const errMsg = err.error?.message || err.message || 'Unknown error';
        alert('Failed to record Goods Receipt: ' + errMsg);
      },
    });
  }
  getGRTotalAmount(items: any[] = []): number {
    return items.reduce((total, item) => {
      const amount =
        item.receivedAmount ?? (Number(item.receivedQty) || 0) * (Number(item.unitPrice) || 0);
      return total + (Number(amount) || 0);
    }, 0);
  }
}
