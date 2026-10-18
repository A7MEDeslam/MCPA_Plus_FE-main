import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MasterDataService } from '../../services/master-data.service';
import { AssetPurchaseOrderService } from '../../services/asset-purchase-order.service';
import { AssetService } from '../../services/asset.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { SearchableSelectComponent, SelectOption } from '../../components/searchable-select/searchable-select.component';
import { AssetPurchaseOrderDetailsDto } from '../../models/asset-procurement.dto';

interface ApoItem {
  assetId: string;
  qty: number | null;
  price: number | null;
}

interface ApoForm {
  supplier: string;
  date: string;
  delivery: string;
  notes: string;
  items: ApoItem[];
}

@Component({
  selector: 'app-asset-purchase-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, SearchableSelectComponent],
  templateUrl: './asset-purchase-orders.component.html',
  styleUrl: './asset-purchase-orders.component.css',
})
export class AssetPurchaseOrdersComponent {
  masterData = inject(MasterDataService);
  apoService = inject(AssetPurchaseOrderService);
  assetService = inject(AssetService);
  authService = inject(AuthService);
  toastService = inject(ToastService);
  router = inject(Router);

  get isCEO() {
    return this.authService.hasAnyRole(['CEO']);
  }
  get isAccountant() {
    return this.authService.hasAnyRole(['Accountant']);
  }
  get canApprove() {
    return this.isCEO || this.isAccountant;
  }
  get canCreate() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin']);
  }
  get canReceive() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin']);
  }

  pagination = useDynamicPagination();
  poSearch = '';
  currentTab = signal<string>('all');
  modals: Record<string, boolean> = { 'modal-apo': false };
  poForm: ApoForm = this.defaultForm();
  selectedPODetails: AssetPurchaseOrderDetailsDto | null = null;
  poDetailsOpen = false;
  savingPO = false;
  constructor() {
    this.assetService.getTree();
  }

  supplierOptions = computed((): SelectOption[] =>
    this.masterData.SUPPLIERS().map((s) => ({ value: s.id, label: s.name })),
  );

  assetOptions = computed((): SelectOption[] =>
    this.assetService.purchasableAssets().map((a) => ({
      value: a.id,
      label: `${a.accountNo} - ${a.name}`,
    })),
  );

  private defaultForm(): ApoForm {
    return {
      supplier: '',
      date: this.apoService.today,
      delivery: '',
      notes: '',
      items: [{ assetId: '', qty: null, price: null }],
    };
  }

  grandTotal(): number {
    return this.poForm.items.reduce((sum, item) => {
      return sum + (Number(item.qty) || 0) * (Number(item.price) || 0);
    }, 0);
  }

  getPOTotalQuantity(items: { orderedQty?: number }[] = []): number {
    return items.reduce((total, item) => total + (Number(item.orderedQty) || 0), 0);
  }

  canApprovePO(status: string): boolean {
    if (!this.canApprove) return false;
    if (this.isCEO) return status === 'Pending' || status === 'AccountantApproved';
    if (this.isAccountant) return status === 'Pending';
    return false;
  }

  statusBadgeClass(status: string): string {
    if (status === 'Received') return 'badge-received';
    if (status === 'Partial') return 'badge-partial';
    if (status === 'Approved') return 'badge-approved';
    if (status === 'AccountantApproved') return 'badge-partial';
    if (status === 'Cancelled') return 'badge-pending';
    return 'badge-pending';
  }

  addItem() {
    this.poForm.items.push({ assetId: '', qty: null, price: null });
  }

  removeItem(index: number) {
    if (this.poForm.items.length > 1) {
      this.poForm.items.splice(index, 1);
    }
  }

  get filteredPOs() {
    const term = this.poSearch.toLowerCase();
    const tab = this.currentTab();
    return this.apoService.POs().filter((p) => {
      if (tab === 'pending' && p.status !== 'Pending' && p.status !== 'AccountantApproved')
        return false;
      if (tab === 'active' && p.status !== 'Approved' && p.status !== 'Partial') return false;
      if (tab === 'completed' && p.status !== 'Received') return false;
      return !term || Object.values(p).join(' ').toLowerCase().includes(term);
    });
  }

  get pagedPOs() {
    const data = this.filteredPOs;
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  }

  closeModalIfOverlay(event: MouseEvent, id: string) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.modals[id] = false;
      if (id === 'modal-apo-details') {
        this.poDetailsOpen = false;
      }
    }
  }

  showPODetails(id: number) {
    this.apoService.getDetails(id).subscribe({
      next: (data) => {
        this.selectedPODetails = data;
        this.poDetailsOpen = true;
      },
      error: (err) => {
        console.error('Failed to load asset PO details:', err);
        alert(err?.error?.message || 'Failed to load purchase order details.');
      },
    });
  }

  savePO() {
    const f = this.poForm;

    if (!f.supplier) return alert('Please select a supplier.');
    if (!f.date) return alert('Please select an order date.');

    const invalidItem = f.items.find((i) => !i.assetId || !i.qty || Number(i.qty) <= 0);
    if (invalidItem) return alert('Please fill in all item rows with an asset and quantity.');

    const duplicateIds = f.items.map((i) => i.assetId);
    const hasDuplicates = duplicateIds.length !== new Set(duplicateIds).size;
    if (hasDuplicates) return alert('Duplicate assets found. Please merge them into one row.');

    this.savingPO = true;
    this.apoService.addPO(f).subscribe({
      next: () => {
        this.savingPO = false;
        this.apoService.fetchPOs();
        this.modals['modal-apo'] = false;
        this.poForm = this.defaultForm();
        this.toastService.show('Asset Purchase Order created!');
      },
      error: (err) => {
        this.savingPO = false;
        console.error('Failed to create asset PO:', err);
        this.toastService.show(err?.error?.message || 'Failed to create purchase order.');
      },
    });
  }

  approvePO(id: number) {
    this.apoService.approvePO(id).subscribe({
      next: () => {
        this.apoService.fetchPOs();
        this.toastService.show('Asset Purchase Order Approved!');
      },
      error: (err) => {
        console.error('Failed to approve asset PO:', err);
        alert(err?.error?.message || 'Failed to approve PO.');
      },
    });
  }

  quickReceive(poId: number) {
    this.router.navigate(['/asset-receive'], { queryParams: { poRef: poId } });
  }
}
