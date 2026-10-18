import { Component, OnInit, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SemiFinishedBalanceService } from '../../services/semi-finished-balance.service.ts';
import { MasterDataService } from '../../services/master-data.service';
import { AuthService } from '../../services/auth.service';
import {
  SemiFinishedBalance,
  CreateSemiFinishedBalance,
} from '../../models/semi-finished-balance.model';
import { PageToggleService } from '../../services/page-toggle.service.ts.js';
import { ToastService } from '../../services/toast.service.js';

@Component({
  selector: 'app-semi-finished-balance-init',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './semi-finished-balance-init.component.ts.html',
  styleUrl: './semi-finished-balance-init.component.ts.css',
})
export class SemiFinishedBalanceInitComponent implements OnInit {
  private balanceService = inject(SemiFinishedBalanceService);
  private masterData = inject(MasterDataService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  balances = signal<SemiFinishedBalance[]>([]);
  searchTerm = signal('');
  showDialog = signal(false);
  loading = signal(false);

  productSearchTerm = signal('');
  productDropdownOpen = signal(false);
  pageToggle = inject(PageToggleService);
  toastService = inject(ToastService);

  // Stat cards
  pendingCount = computed(() => this.balances().filter((b) => b.status === 'Pending').length);
  approvedCount = computed(() => this.balances().filter((b) => b.status === 'Approved').length);
  rejectedCount = computed(() => this.balances().filter((b) => b.status === 'Rejected').length);
  totalCount = computed(() => this.balances().length);

  selectedProductId = signal<number | null>(null);

  selectedProductName = computed(() => {
    const id = this.selectedProductId();
    const item = this.semiFinishedItems().find((p) => p.id === id);
    return item ? item.name : null;
  });
  selectProduct(id: number | null): void {
    this.form.get('semiFinishedId')?.setValue(id);
    this.selectedProductId.set(id); // ✅ يحدّث الـ computed
    this.productDropdownOpen.set(false);
    this.productSearchTerm.set('');
  }

  openDialog(): void {
    this.form.reset({
      semiFinishedId: null,
      balanceDate: this.today(),
      adjustedStock: 0,
      notes: '',
    });
    this.selectedProductId.set(null); // ✅ reset the signal too
    this.productDropdownOpen.set(false);
    this.productSearchTerm.set('');
    this.showDialog.set(true);
  }
  get isCeo() {
    return this.authService.hasAnyRole(['CEO']);
  }
  get pageDisabled() {
    return this.pageToggle.semiFinishedBalanceInitDisabled();
  }

  togglePageAccess() {
    this.pageToggle.toggleSemiFinishedBalanceInit();
    this.toastService.show(
      this.pageToggle.semiFinishedBalanceInitDisabled()
        ? 'Page has been disabled for non-CEO users.'
        : 'Page has been enabled for all users.',
    );
  }
  filteredBalances = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.balances();
    return this.balances().filter((b) => b.semiFinishedName.toLowerCase().includes(term));
  });

  // Semi-finished items for the dropdown — sourced from MasterDataService.SEMI_ITEMS
  semiFinishedItems = computed(() =>
    this.masterData.SEMI_ITEMS().map((p: any) => ({ id: p.id, name: p.name })),
  );

  filteredProducts = computed(() => {
    const term = this.productSearchTerm().toLowerCase().trim();
    const list = this.semiFinishedItems();
    if (!term) return list;
    return list.filter((p) => p.name.toLowerCase().includes(term));
  });

 

  canApproveReject = computed(() => this.authService.hasAnyRole(['Accountant', 'CEO']));

  form: FormGroup = this.fb.group({
    semiFinishedId: [null, Validators.required],
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

  loadBalances(): void {
    this.loading.set(true);
    this.balanceService.getAll().subscribe({
      next: (data) => {
        this.balances.set(data);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load semi-finished balances', err);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
  }

 

  closeDialog(): void {
    this.showDialog.set(false);
  }

  toggleProductDropdown(): void {
    this.productDropdownOpen.update((v) => !v);
    if (this.productDropdownOpen()) {
      this.productSearchTerm.set('');
    }
  }

  onProductSearch(value: string): void {
    this.productSearchTerm.set(value);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;
    const payload: CreateSemiFinishedBalance = {
      semiFinishedId: raw.semiFinishedId,
      balanceDate: new Date(raw.balanceDate).toISOString(),
      adjustedStock: raw.adjustedStock,
      notes: raw.notes ?? '',
    };

    this.balanceService.create(payload).subscribe({
      next: () => {
        this.closeDialog();
        this.loadBalances();
      },
      error: (err) => console.error('Failed to create semi-finished balance', err),
    });
  }

  approve(row: SemiFinishedBalance): void {
    const user = this.authService.getUser();
    const payload = { accountantUserId: user?.username ?? '', isApproved: true, notes: '' };
    this.balanceService.approve(row.id, payload).subscribe({
      next: () => this.loadBalances(),
      error: (err) => console.error('Approve failed', err),
    });
  }

  reject(row: SemiFinishedBalance): void {
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
