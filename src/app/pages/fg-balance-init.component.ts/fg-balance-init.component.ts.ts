import { Component, OnInit, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FinishedProductBalanceService } from '../../services/finished-product-balance.service';
import { MasterDataService } from '../../services/master-data.service';
import {
  FinishedProductBalance,
  CreateFinishedProductBalance,
} from '../../models/finished-product-balance.dto';
import { AuthService } from '../../services/auth.service';
import { PageToggleService } from '../../services/page-toggle.service.ts';
import { ToastService } from '../../services/toast.service';
@Component({
  selector: 'app-fg-balance-init',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './fg-balance-init.component.ts.html',
  styleUrl: './fg-balance-init.component.ts.css',
})
export class FgBalanceInitComponent implements OnInit {
  private balanceService = inject(FinishedProductBalanceService);
  toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  masterData = inject(MasterDataService);
  pageToggle = inject(PageToggleService);
  balances = signal<FinishedProductBalance[]>([]);
  productSearchTerm = signal('');
  productDropdownOpen = signal(false);
 
  filteredProducts = computed(() => {
    const term = this.productSearchTerm().toLowerCase().trim();
    const list = this.finishedProducts();
    if (!term) return list;
    return list.filter((p) => p.name.toLowerCase().includes(term));
  });
  finishedProducts = computed(() =>
    this.masterData.PRODUCTS().map((p) => ({ id: p.id, name: p.name })),
  );
  selectedProductName = computed(() => {
    const id = this.selectedProductId();
    const product = this.finishedProducts().find((p) => p.id === id);
    return product ? product.name : null;
  });

  selectedProductId = signal<number | null>(null);
  openDialog(): void {
    this.form.reset({
      finishedProductId: null,
      balanceDate: this.today(),
      adjustedStock: 0,
      notes: '',
    });
    this.selectedProductId.set(null);
    this.productDropdownOpen.set(false);
    this.productSearchTerm.set('');
    this.showDialog.set(true);
  }
  toggleProductDropdown(): void {
    this.productDropdownOpen.update((v) => !v);
    if (this.productDropdownOpen()) {
      this.productSearchTerm.set('');
    }
  }

  selectProduct(id: number | null): void {
    this.form.get('finishedProductId')?.setValue(id);
    this.selectedProductId.set(id);
    this.productDropdownOpen.set(false);
    this.productSearchTerm.set('');
  }

  onProductSearch(value: string): void {
    this.productSearchTerm.set(value);
  }


  searchTerm = signal('');
  showDialog = signal(false);
  loading = signal(false);

  // Stat cards
  pendingCount = computed(() => this.balances().filter((b) => b.status === 'Pending').length);
  approvedCount = computed(() => this.balances().filter((b) => b.status === 'Approved').length);
  rejectedCount = computed(() => this.balances().filter((b) => b.status === 'Rejected').length);
  totalCount = computed(() => this.balances().length);

  filteredBalances = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.balances();
    return this.balances().filter((b) => b.finishedProductName.toLowerCase().includes(term));
  });

  form: FormGroup = this.fb.group({
    finishedProductId: [null, Validators.required],
    balanceDate: [this.today(), Validators.required],
    adjustedStock: [0, [Validators.required, Validators.min(0)]],
    notes: [''],
  });

  ngOnInit(): void {
    this.loadBalances();
  }

  today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  get isCeo() {
    return this.authService.hasAnyRole(['CEO']);
  }
  get pageDisabled() {
    return this.pageToggle.fgBalanceInitDisabled();
  }

  togglePageAccess() {
    this.pageToggle.toggleFgBalanceInit();
    this.toastService.show(
      this.pageToggle.fgBalanceInitDisabled()
        ? 'Page has been disabled for non-CEO users.'
        : 'Page has been enabled for all users.',
    );
  }
  loadBalances(): void {
    this.loading.set(true);
    this.balanceService.getAll().subscribe({
      next: (data) => {
        this.balances.set(data);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load balances', err);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
    });
  }
  canApproveReject = computed(() => this.authService.hasAnyRole(['Accountant', 'CEO']));
  onSearch(value: string): void {
    this.searchTerm.set(value);
  }

  closeDialog(): void {
    this.showDialog.set(false);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;
    const payload: CreateFinishedProductBalance = {
      finishedProductId: raw.finishedProductId,
      balanceDate: new Date(raw.balanceDate).toISOString(),
      adjustedStock: raw.adjustedStock,
      notes: raw.notes ?? '',
    };

    this.balanceService.create(payload).subscribe({
      next: () => {
        this.closeDialog();
        this.loadBalances();
      },
      error: (err) => console.error('Failed to create balance', err),
    });
  }

  approve(row: FinishedProductBalance): void {
    const user = this.authService.getUser();
    const payload = { accountantUserId: user?.username ?? '', isApproved: true, notes: '' };
    this.balanceService.approve(row.id, payload).subscribe({
      next: () => this.loadBalances(),
      error: (err) => console.error('Approve failed', err),
    });
  }

  reject(row: FinishedProductBalance): void {
    const user = this.authService.getUser();
    const payload = { accountantUserId: user?.username ?? '', isApproved: false, notes: '' };
    this.balanceService.reject(row.id, payload).subscribe({
      next: () => this.loadBalances(),
      error: (err) => console.error('Reject failed', err),
    });
  }

  gapClass(gap: number): string {
    if (gap > 0) return 'gap-positive';
    if (gap < 0) return 'gap-negative';
    return 'gap-neutral';
  }
}
