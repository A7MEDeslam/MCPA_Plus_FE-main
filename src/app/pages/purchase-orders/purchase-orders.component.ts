import { Component, inject, signal, computed,ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { MasterDataService } from '../../services/master-data.service';
import { PurchaseOrderService } from '../../services/purchase-order.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import {
  SearchableSelectComponent,
  SelectOption,
} from '../../components/searchable-select/searchable-select.component';

interface PoItem {
  rawMaterialId: string;
  qty: number | null;
  price: number | null;
}

interface PoForm {
  supplier: string;
  date: string;
  delivery: string;
  notes: string;
  items: PoItem[];
}

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, SearchableSelectComponent],
  templateUrl: './purchase-orders.component.html',
  styleUrl: './purchase-orders.component.css',
})
export class PurchaseOrdersComponent {
  masterData = inject(MasterDataService);
  poService = inject(PurchaseOrderService);
  authService = inject(AuthService);
  toastService = inject(ToastService);
  http = inject(HttpClient);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);
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
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin']);
  }
  get canReceive() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin']);
  }

  pagination = useDynamicPagination();

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
    return 'badge-pending';
  }

  get pagedPOs() {
    const data = this.filteredPOs;
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  }

  poSearch = '';
  currentTab = signal<string>('all');
  modals: Record<string, boolean> = { 'modal-po': false };
  poForm: PoForm = this.defaultForm();
  selectedPODetails: any = null;
  poDetailsOpen = false;
  editingPOId: number | null = null;
  supplierOptions = computed((): SelectOption[] =>
    this.masterData.SUPPLIERS().map((s) => ({ value: s.id, label: s.name })),
  );

  rawMaterialOptions = computed((): SelectOption[] =>
    this.masterData
      .RAW_ITEMS()
      .map((m) => ({ value: m.id, label: `${m.code ? m.code + ' - ' : ''}${m.name}` })),
  );

  private defaultForm(): PoForm {
    return {
      supplier: '',
      date: this.poService.today,
      delivery: '',
      notes: '',
      items: [{ rawMaterialId: '', qty: null, price: null }],
    };
  }

  grandTotal(): number {
    return this.poForm.items.reduce((sum, item) => {
      return sum + (Number(item.qty) || 0) * (Number(item.price) || 0);
    }, 0);
  }

  getPOTotalQuantity(items: any[] = []): number {
    return items.reduce((total, item) => total + (Number(item.orderedQty) || 0), 0);
  }

  getPOTotalAmount(items: any[] = []): number {
    return items.reduce((total, item) => {
      const qty = Number(item.orderedQty ?? item.qty) || 0;
      const price = Number(item.unitPrice ?? item.price) || 0;
      return total + qty * price;
    }, 0);
  }

  addItem() {
    this.poForm.items.push({ rawMaterialId: '', qty: null, price: null });
  }

  removeItem(index: number) {
    if (this.poForm.items.length > 1) {
      this.poForm.items.splice(index, 1);
    }
  }

  get filteredPOs() {
    const term = this.poSearch.toLowerCase();
    const tab = this.currentTab();
    return this.poService.POs().filter((p) => {
      if (tab === 'pending' && p.status !== 'Pending' && p.status !== 'AccountantApproved')
        return false;
      if (tab === 'active' && p.status !== 'Approved' && p.status !== 'Partial') return false;
      if (tab === 'completed' && p.status !== 'Received') return false;
      return !term || Object.values(p).join(' ').toLowerCase().includes(term);
    });
  }

  closeModalIfOverlay(event: MouseEvent, id: string) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.modals[id] = false;
      if (id === 'modal-po-details') {
        this.poDetailsOpen = false;
      }
      if (id === 'modal-reject') this.rejectModalOpen = false; // ← add this
    }
  }

  showPODetails(id: number) {
    const existing = this.poService.POs().find((p) => p.id === id);
    this.selectedPODetails = existing || { id };
    this.poDetailsOpen = true;

    if (existing && existing.items && existing.items.length) {
      return;
    }

    this.http.get<any>(`${environment.apiUrl}/PurchaseOrders/${id}`).subscribe({
      next: (data) => {
        this.selectedPODetails = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load PO details:', err);
        alert(err?.error?.message || 'Failed to load purchase order details.');
        this.poDetailsOpen = false;
      },
    });
  }
  editPO(id: number) {
    if (!this.canCreate) {
      alert('You do not have permission to edit purchase orders.');
      return;
    }

    const po = this.poService.POs().find((p) => p.id === id);

    if (!po) {
      alert('Purchase order not found.');
      return;
    }

    if (po.status !== 'Pending' && po.status !== 'AccountantApproved') {
      alert('Only Pending or AccountantApproved purchase orders can be edited.');
      return;
    }

    this.http.get<any>(`${environment.apiUrl}/PurchaseOrders/${id}`).subscribe({
      next: (data) => {
        this.editingPOId = id;

        this.poForm = {
          supplier: String(data.supplierId ?? data.supplier?.id ?? po.supplierId ?? ''),

          date: data.orderDate ? String(data.orderDate).slice(0, 10) : this.poService.today,

          delivery: data.deliveryDate ? String(data.deliveryDate).slice(0, 10) : '',

          notes: data.notes || '',

          items: (data.items || []).map((item: any) => ({
            rawMaterialId: String(item.rawMaterialId ?? item.rawMaterial?.id ?? ''),

            qty: Number(item.orderedQty ?? item.qty ?? 0),

            price: Number(item.unitPrice ?? item.price ?? 0),
          })),
        };

        if (!this.poForm.items.length) {
          this.poForm.items = [
            {
              rawMaterialId: '',
              qty: null,
              price: null,
            },
          ];
        }

        this.modals['modal-po'] = true;
        this.cdr.detectChanges();
      },

      error: (err) => {
        console.error('Failed to load PO for editing:', err);
        alert(err?.error?.message || 'Failed to load purchase order for editing.');
      },
    });
  }
  // savePO() {
  //   const f = this.poForm;

  //   if (!f.supplier) return alert('Please select a supplier.');
  //   if (!f.date) return alert('Please select an order date.');

  //   const invalidItem = f.items.find((i) => !i.rawMaterialId || !i.qty || Number(i.qty) <= 0);
  //   if (invalidItem) return alert('Please fill in all item rows with a material and quantity.');

  //   const duplicateIds = f.items.map((i) => i.rawMaterialId);
  //   const hasDuplicates = duplicateIds.length !== new Set(duplicateIds).size;
  //   if (hasDuplicates)
  //     return alert('Duplicate raw materials found. Please merge them into one row.');

  //   this.poService.addPO(f).subscribe({
  //     next: () => {
  //       this.poService.fetchPOs();
  //       this.modals['modal-po'] = false;
  //       this.poForm = this.defaultForm();
  //       this.toastService.show('Purchase Order created!');
  //     },
  //     error: (err) => {
  //       console.error('Failed to create PO:', err);
  //       alert(err?.error?.message || 'Failed to create purchase order.');
  //     },
  //   });
  // }
  savePO() {
    const f = this.poForm;

    if (!f.supplier) {
      return alert('Please select a supplier.');
    }

    if (!f.date) {
      return alert('Please select an order date.');
    }
    if (!f.date) {
      return alert('Please select an order date.');
    }

    if (f.delivery && f.delivery < f.date) {
      return alert('Delivery date cannot be before the order date.');
    }
    const invalidItem = f.items.find((i) => !i.rawMaterialId || !i.qty || Number(i.qty) <= 0);

    if (invalidItem) {
      return alert('Please fill in all item rows with a material and quantity.');
    }

    const duplicateIds = f.items.map((i) => i.rawMaterialId);

    const hasDuplicates = duplicateIds.length !== new Set(duplicateIds).size;

    if (hasDuplicates) {
      return alert('Duplicate raw materials found. Please merge them into one row.');
    }

    // EDIT
    if (this.editingPOId !== null) {
      const id = this.editingPOId;

      this.poService.updatePO(id, f).subscribe({
        next: () => {
          this.poService.fetchPOs();

          this.modals['modal-po'] = false;
          this.editingPOId = null;
          this.poForm = this.defaultForm();

          this.toastService.show('Purchase Order updated successfully!');
        },

        error: (err) => {
          console.error('Failed to update PO:', err);

          alert(err?.error?.message || 'Failed to update purchase order.');
        },
      });

      return;
    }

    // CREATE
    this.poService.addPO(f).subscribe({
      next: () => {
        this.poService.fetchPOs();

        this.modals['modal-po'] = false;
        this.poForm = this.defaultForm();

        this.toastService.show('Purchase Order created!');
      },

      error: (err) => {
        console.error('Failed to create PO:', err);

        alert(err?.error?.message || 'Failed to create purchase order.');
      },
    });
  }
  onOrderDateChange() {
    if (this.poForm.delivery && this.poForm.delivery < this.poForm.date) {
      this.poForm.delivery = '';
    }
  }
  deletePO(id: number) {
    if (!this.canCreate) {
      alert('You do not have permission to delete purchase orders.');
      return;
    }

    const po = this.poService.POs().find((p) => p.id === id);

    if (!po) {
      alert('Purchase order not found.');
      return;
    }

    if (po.status !== 'Pending') {
      alert('Only Pending purchase orders can be deleted.');
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete PO ${po.poNumber}?`);

    if (!confirmed) return;

    this.poService.deletePO(id).subscribe({
      next: () => {
        this.poService.fetchPOs();

        this.toastService.show('Purchase Order deleted successfully!');
      },

      error: (err) => {
        console.error('Failed to delete PO:', err);

        alert(err?.error?.message || 'Failed to delete purchase order.');
      },
    });
  }
  closePOModal() {
    this.modals['modal-po'] = false;
    this.editingPOId = null;
    this.poForm = this.defaultForm();
  }
  approvePO(id: number) {
    this.poService.approvePO(id).subscribe({
      next: () => {
        this.poService.fetchPOs();
        this.toastService.show('Purchase Order Approved!');
      },
      error: (err) => {
        console.error('Failed to approve PO:', err);
        alert(JSON.stringify(err?.error)); // شوف الـ message كاملة
      },
    });
  }
  // rejection modal state
  rejectTargetId: number | null = null;
  rejectReason = '';
  rejectModalOpen = false;

  openRejectModal(id: number) {
    this.rejectTargetId = id;
    this.rejectReason = '';
    this.rejectModalOpen = true;
  }

  confirmReject() {
    if (!this.rejectTargetId) return;
    this.poService.rejectPO(this.rejectTargetId, this.rejectReason).subscribe({
      next: () => {
        this.poService.fetchPOs();
        this.rejectModalOpen = false;
        this.rejectTargetId = null;
        this.toastService.show('Purchase Order rejected.');
      },
      error: (err) => {
        alert(err?.error?.message || 'Failed to reject PO.');
      },
    });
  }

  accountantApprovePO(id: number) {
    this.poService.accountantApprovePO(id).subscribe({
      next: () => {
        this.poService.fetchPOs();
        this.toastService.show('Purchase Order approved by Accountant!');
      },
      error: (err) => {
        console.error('Failed to accountant-approve PO:', err);
        alert(err?.error?.message || 'Failed to approve PO.');
      },
    });
  }

  quickReceive(poId: number) {
    this.router.navigate(['/receive'], { queryParams: { poRef: poId } });
  }
  getPOTotalRemainingQty(items: any[] = []): number {
    return items.reduce((total, item) => {
      const remaining =
        item.remainingQty ??
        (Number(item.orderedQty ?? item.qty) || 0) - (Number(item.receivedQty) || 0);
      return total + (Number(remaining) || 0);
    }, 0);
  }

  getPOTotalRemainingAmount(items: any[] = []): number {
    return items.reduce((total, item) => {
      const remaining =
        item.remainingQty ??
        (Number(item.orderedQty ?? item.qty) || 0) - (Number(item.receivedQty) || 0);
      const price = Number(item.unitPrice ?? item.price) || 0;
      return total + (Number(remaining) || 0) * price;
    }, 0);
  }
}
