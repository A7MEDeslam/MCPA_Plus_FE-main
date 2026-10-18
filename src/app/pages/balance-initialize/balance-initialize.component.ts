import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MasterDataService } from '../../services/master-data.service';
import { BalanceInitializeService } from '../../services/balance-initialize.service';
import { ToastService } from '../../services/toast.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { AuthService } from '../../services/auth.service';
import { SearchableSelectComponent, SelectOption } from '../../components/searchable-select/searchable-select.component';
import { PageToggleService } from '../../services/page-toggle.service.ts';
@Component({
  selector: 'app-balance-initialize',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, SearchableSelectComponent],
  templateUrl: './balance-initialize.component.html',
  styleUrl: './balance-initialize.component.css',
})
export class BalanceInitializeComponent {
  masterData = inject(MasterDataService);
  balanceSvc = inject(BalanceInitializeService);
  toastService = inject(ToastService);
  authService = inject(AuthService);
  pageToggle = inject(PageToggleService);
  get isCeo() {
    return this.authService.hasAnyRole(['CEO']);
  }
  get pageDisabled() {
    return this.pageToggle.balanceInitDisabled();
  }

  togglePageAccess() {
    this.pageToggle.toggleBalanceInit();
    this.toastService.show(
      this.pageToggle.balanceInitDisabled()
        ? 'Page has been disabled for non-CEO users.'
        : 'Page has been enabled for all users with access.',
    );
  }
  // CEO/Admin can create; Accountant can approve
  get canCreate() {
    return this.authService.hasAnyRole(['CEO', 'Admin']);
  }
  get canApprove() {
    return this.authService.hasAnyRole(['Accountant']);
  }

  rawMaterialOptions = computed((): SelectOption[] =>
    this.masterData
      .RAW_ITEMS()
      .map((m) => ({ value: m.id, label: `${m.code ? m.code + ' - ' : ''}${m.name} (${m.unit})` })),
  );

  pagination = useDynamicPagination();
  searchQuery = signal('');
  isSubmitting = signal(false);

  modalOpen = false;
  approveModalOpen = false;
  selectedBalance: any = null;

  form = {
    rawMaterialId: 0,
    balanceDate: new Date().toISOString().split('T')[0],
    adjustedStock: 0,
    notes: '',
  };

  approveForm = {
    isApproved: true,
    notes: '',
  };

  filteredBalances = computed(() => {
    const term = this.searchQuery().toLowerCase().trim();
    const data = this.balanceSvc.BALANCE_INITIALIZATIONS();
    if (!term) return data;
    return data.filter(
      (b: any) =>
        (b.rawMaterialName && b.rawMaterialName.toLowerCase().includes(term)) ||
        (b.status && b.status.toLowerCase().includes(term)) ||
        (b.notes && b.notes.toLowerCase().includes(term)),
    );
  });

  pagedBalances = computed(() => {
    const data = this.filteredBalances();
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  pendingCount = computed(
    () =>
      this.balanceSvc.BALANCE_INITIALIZATIONS().filter((b: any) => b.status === 'Pending').length,
  );

  approvedCount = computed(
    () =>
      this.balanceSvc.BALANCE_INITIALIZATIONS().filter((b: any) => b.status === 'Approved').length,
  );

  rejectedCount = computed(
    () =>
      this.balanceSvc.BALANCE_INITIALIZATIONS().filter((b: any) => b.status === 'Rejected').length,
  );

  openCreateModal() {
    this.isSubmitting.set(false);
    this.form = {
      rawMaterialId: this.masterData.RAW_ITEMS()[0]?.id ?? 0,
      balanceDate: new Date().toISOString().split('T')[0],
      adjustedStock: 0,
      notes: '',
    };
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.isSubmitting.set(false);
  }

  closeModalIfOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  createBalance() {
    if (this.isSubmitting()) return;
    if (!this.form.rawMaterialId || this.form.adjustedStock < 0) {
      return alert('Raw Material and Adjusted Stock are required.');
    }

    this.isSubmitting.set(true);
    const payload = {
      rawMaterialId: Number(this.form.rawMaterialId),
      balanceDate: this.form.balanceDate,
      adjustedStock: Number(this.form.adjustedStock),
      notes: this.form.notes || undefined,
    };

    this.balanceSvc.create(payload).subscribe({
      next: () => {
        this.toastService.show('Balance initialization created.');
        this.closeModal();
        this.pagination.resetPage();
      },
      error: (err) => {
        console.error('Failed to create balance initialization', err);
        this.toastService.show(err?.error?.message || 'Failed to create balance initialization');
        this.isSubmitting.set(false);
      },
    });
  }

  openApproveModal(balance: any) {
    this.selectedBalance = balance;
    this.approveForm = { isApproved: true, notes: '' };
    this.approveModalOpen = true;
  }

  closeApproveModal() {
    this.approveModalOpen = false;
    this.selectedBalance = null;
  }

  approveBalance() {
    if (!this.selectedBalance) return;

    const userId = this.getUserId();
    const payload = {
      accountantUserId: userId,
      isApproved: this.approveForm.isApproved,
      notes: this.approveForm.notes || undefined,
    };

    this.balanceSvc.approve(this.selectedBalance.id, payload).subscribe({
      next: () => {
        this.toastService.show(
          this.approveForm.isApproved ? 'Balance approved.' : 'Balance rejected.',
        );
        this.closeApproveModal();
      },
      error: (err) => {
        console.error('Failed to process balance', err);
        this.toastService.show(err?.error?.message || 'Failed to process balance');
      },
    });
  }

  rejectBalance(balance: any) {
    if (!confirm('Are you sure you want to reject this balance?')) return;

    this.balanceSvc.reject(balance.id).subscribe({
      next: () => {
        this.toastService.show('Balance rejected.');
      },
      error: (err) => {
        console.error('Failed to reject balance', err);
        this.toastService.show(err?.error?.message || 'Failed to reject balance');
      },
    });
  }

  private getUserId(): number {
    const token = this.authService.getToken?.() ?? localStorage.getItem('token') ?? '';
    if (!token) return 0;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const raw =
        payload['nameid'] ??
        payload['sub'] ??
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ??
        '0';
      return parseInt(raw, 10) || 0;
    } catch {
      return 0;
    }
  }

  getStatusBadgeClass(status: string): string {
    const map: { [key: string]: string } = {
      Pending: 'badge-partial',
      Approved: 'badge-received',
      Rejected: 'badge-cancelled',
    };
    return map[status] || 'badge-secondary';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }
}
