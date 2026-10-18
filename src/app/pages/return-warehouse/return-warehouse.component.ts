import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ReturnWarehouseService } from '../../services/return-warehouse.service';
import { SerialNumberService } from '../../services/serial-number.service';
import { BomService } from '../../services/bom.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { MasterDataService } from '../../services/master-data.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import {
  ReturnAction,
  ReturnApprovalStatus,
  CreateReturnedProductDto,
  ApproveScrapDto,
  ReturnedProductResponseDto,
  CreateReturnedProductOldSerialDto,
} from '../../models/return-warehouse.dto';
import { environment } from '../../../environments/environment';

// FIX 1: interface must live *before* the decorator, not between @Component(...) and the class.
interface MaterialLine {
  kind: 'raw' | 'semi';
  rawMaterialId?: number;
  semiFinishedId?: number;
  name: string;
  code: string;
  quantity: number;
  unit: string;
}

// Shared shape used by addMaterialLine / removeMaterialLine / loadBomEntriesForProduct
// so both the tracked-serial form and the old-serial form can reuse the same methods.
interface MaterialsFormLike {
  recoveredMaterials: MaterialLine[];
  maintenanceMaterials: MaterialLine[];
}

const DEMO_WORK_CENTER_RETURNS: ReturnedProductResponseDto[] = [
  {
    id: 7001, serialNumberId: 5001, serial: 'MTS-CP100-000005', productName: 'Control Panel 100', productCode: 'FP-TEST-001', reason: 'Customer reported loose connector', isGood: false, action: 'Maintain', actionId: ReturnAction.Maintain, approvalStatus: 'Not required', approvalStatusId: ReturnApprovalStatus.NotRequired, isResolved: false, createdAt: '2026-10-16T09:20:00', createdBy: 'Warehouse Team', recoveredMaterials: [], maintenanceMaterials: [{ rawMaterialId: 21, rawMaterialName: 'Copper Wire', rawMaterialCode: 'RM-002', unit: 'M', quantity: 2 }],
  },
  {
    id: 7002, serialNumberId: 5002, serial: 'MTS-CP100-000006', productName: 'Control Panel 100', productCode: 'FP-TEST-001', reason: 'Returned after inspection', isGood: true, action: 'Move to Good', actionId: ReturnAction.MoveToGood, approvalStatus: 'Not required', approvalStatusId: ReturnApprovalStatus.NotRequired, isResolved: true, createdAt: '2026-10-15T14:10:00', createdBy: 'Technical Team', recoveredMaterials: [], maintenanceMaterials: [],
  },
  {
    id: 7003, serialNumberId: 5010, serial: 'MTS-PQB-000001', productName: 'Power Quality Beacon', productCode: 'FP-TEST-002', reason: 'Burnt board and damaged enclosure', isGood: false, action: 'Scrap with approval', actionId: ReturnAction.ScrapWithApproval, approvalStatus: 'Pending CEO approval', approvalStatusId: ReturnApprovalStatus.PendingCeo, isResolved: false, createdAt: '2026-10-14T11:45:00', createdBy: 'Technical Team', recoveredMaterials: [], maintenanceMaterials: [],
  },
  {
    id: 7004, serialNumberId: 5011, serial: 'MTO-IG200-000015', productName: 'Industrial Gateway', productCode: 'FP-TEST-003', reason: 'Unit beyond repair', isGood: false, action: 'Scrap with approval', actionId: ReturnAction.ScrapWithApproval, approvalStatus: 'Approved', approvalStatusId: ReturnApprovalStatus.Approved, approvedByName: 'Azab', approvalNotes: 'Recover usable modules manually.', approvedAt: '2026-10-13T16:30:00', isResolved: true, createdAt: '2026-10-12T10:00:00', createdBy: 'Warehouse Team', recoveredMaterials: [{ rawMaterialId: 31, rawMaterialName: 'Copper Wire', rawMaterialCode: 'RM-002', unit: 'M', quantity: 4 }], maintenanceMaterials: [],
  },
  {
    id: 7005, serialNumberId: 5020, serial: 'SFG-DRV-000021', productName: 'Drive Unit', productCode: 'SF-DRV-400', reason: 'Returned for inspection', isGood: true, action: 'Move to Good', actionId: ReturnAction.MoveToGood, approvalStatus: 'Not required', approvalStatusId: ReturnApprovalStatus.NotRequired, isResolved: true, createdAt: '2026-10-11T13:25:00', createdBy: 'Technical Team', returnType: 'SemiFinished', recoveredMaterials: [], maintenanceMaterials: [],
  },
  {
    id: 7006, serialNumberId: 5021, serial: 'SFG-CTRL-000008', productName: 'Control Module', productCode: 'SF-CTRL-210', reason: 'Connector needs replacement', isGood: false, action: 'Maintain', actionId: ReturnAction.Maintain, approvalStatus: 'Not required', approvalStatusId: ReturnApprovalStatus.NotRequired, isResolved: false, createdAt: '2026-10-10T08:40:00', createdBy: 'Work Center', returnType: 'SemiFinished', recoveredMaterials: [], maintenanceMaterials: [{ rawMaterialId: 21, rawMaterialName: 'Copper Wire', rawMaterialCode: 'RM-002', unit: 'M', quantity: 1 }],
  },
];

@Component({
  selector: 'app-return-warehouse',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, RouterLink],
  templateUrl: './return-warehouse.component.html',
  styleUrl: './return-warehouse.component.css',
})
export class ReturnWarehouseComponent implements OnInit {
  @Input() embedded = false;
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  returnService = inject(ReturnWarehouseService);
  serialService = inject(SerialNumberService);
  bomService = inject(BomService);
  authService = inject(AuthService);
  toastService = inject(ToastService);
  masterData = inject(MasterDataService);

  activeTab = signal<'logs' | 'new' | 'approvals' | 'returnToWarehouse'>('logs');
  pagination = useDynamicPagination();
  approvalPagination = useDynamicPagination();
  editingReasonReturn = signal<ReturnedProductResponseDto | null>(null);
  editReasonText = signal('');
  isSavingReason = signal(false);
  // Search & Filter state
  returnsSearchText = signal('');
  returnTypeFilter = signal<'all' | 'finished' | 'semi'>('all');
  rawMaterialSearchText = signal('');
  showRawMaterialDropdown = signal<'recovered' | 'maintenance' | null>(null);

  // Which registration flow is active in the "Log Product Return" tab
  registrationMode = signal<'tracked' | 'old'>('tracked');

  // Form State — tracked serial flow
  // FIX: typed as MaterialLine[] instead of any[] so the compiler actually catches shape mismatches
  newReturnForm = {
    serial: '',
    customerName: '',
    projectName: '',
    reason: '',
    isGood: true,
    action: ReturnAction.MoveToGood,
    recoveredMaterials: [] as MaterialLine[],
    maintenanceMaterials: [] as MaterialLine[],
  };
  readonly returnCustomerOptions = ['Atlas Manufacturing', 'Nile Telecom', 'Delta Energy'];
  readonly returnProjectsByCustomer: Record<string, { name: string; serials: string[] }[]> = {
    'Atlas Manufacturing': [
      { name: 'Atlas Control Upgrade', serials: ['MTS-CP100-000005', 'MTS-CP100-000006'] },
    ],
    'Nile Telecom': [
      { name: 'Nile Gateway Rollout', serials: ['MTO-IG200-000015', 'MTO-IG200-000016'] },
    ],
    'Delta Energy': [
      { name: 'Delta Beacon Service', serials: ['MTS-PQB-000001', 'MTS-PQB-000002'] },
    ],
  };

  // Form State — old / untracked serial flow
  oldReturnForm = {
    finishedProductId: null as number | null,
    oldSerial: '',
    reason: '',
    isGood: true,
    action: ReturnAction.MoveToGood,
    recoveredMaterials: [] as MaterialLine[],
    maintenanceMaterials: [] as MaterialLine[],
  };

  verifiedSerial = signal<any>(null);
  verificationError = signal('');
  verificationNotice = signal('');
  isVerifying = signal(false);
  sortDirection = signal<'asc' | 'desc'>('desc');
  // Details Modal or inline accordion expansion
  expandedReturnId = signal<number | null>(null);

  // Approval Modal State
  selectedReturnForApproval = signal<ReturnedProductResponseDto | null>(null);
  approvalForm = {
    isApproved: true,
    notes: '',
  };

  // User details computed
  currentUserRoles = computed(() => {
    const user = this.authService.getUser();
    return (user?.roles || []).map((r) => r.toLowerCase());
  });
  returnToWarehouseForm = {
    serial: '',
  };
  isSubmittingReturnToWarehouse = signal(false);
  workCenterStepConfirmed = signal(false);
  isCeo = computed(() => this.currentUserRoles().includes('ceo'));
  isAdmin = computed(() => this.currentUserRoles().includes('admin'));
  isEngineer = computed(() => this.currentUserRoles().includes('engineer'));
  isAccountant = computed(() => this.currentUserRoles().includes('accountant'));

  canApprove = computed(() => this.isCeo());
  canCreate = computed(
    () => this.isCeo() || this.isEngineer() || this.isAdmin() || this.isAccountant(),
  );
  get returnProjectOptions() {
    return this.returnProjectsByCustomer[this.newReturnForm.customerName] || [];
  }
  get returnSerialOptions() {
    return this.returnProjectOptions.flatMap((project) => project.serials);
  }
  onReturnCustomerChange(): void {
    this.newReturnForm.projectName = this.returnProjectOptions[0]?.name || '';
    this.newReturnForm.serial = '';
  }
  onReturnProjectChange(): void {
    this.newReturnForm.serial = '';
  }
  canViewApprovalsTab = computed(() => this.isCeo() || this.isEngineer());
  isAllReturnsPage = computed(() => {
    const path = this.route.snapshot.routeConfig?.path;
    return path === 'work-center' || path === 'returnwh';
  });

  // Statistics
  totalReturnsCount = computed(() => this.returnService.returns().length);
  pendingApprovalsCount = computed(() => this.returnService.pendingApprovals().length);
  resolvedCount = computed(() => this.returnService.returns().filter((r) => r.isResolved).length);
  scrappedCount = computed(
    () =>
      this.returnService
        .returns()
        .filter(
          (r) =>
            r.actionId === ReturnAction.ScrapWithApproval &&
            r.approvalStatusId === ReturnApprovalStatus.Approved,
        ).length,
  );

  // Filtered Returns List
  filteredReturns = computed(() => {
    const data = this.returnService.returns();
    const term = this.returnsSearchText().toLowerCase().trim();
    const typeFilter = this.returnTypeFilter();
    const dir = this.sortDirection();

    const filtered = data.filter((r) => {
      const matchesType = typeFilter === 'all' || this.getReturnType(r) === typeFilter;
      const matchesTerm = !term ||
        r.serial.toLowerCase().includes(term) ||
        r.productName.toLowerCase().includes(term) ||
        r.productCode.toLowerCase().includes(term) ||
        r.reason.toLowerCase().includes(term) ||
        r.action.toLowerCase().includes(term);
      return matchesType && matchesTerm;
    });

    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dir === 'desc' ? dateB - dateA : dateA - dateB;
    });
  });

  getReturnType(ret: ReturnedProductResponseDto): 'finished' | 'semi' {
    if (ret.returnType === 'SemiFinished') return 'semi';
    if (ret.returnType === 'Finished') return 'finished';
    // Backward-compatible fallback while older API rows do not include returnType.
    return /^SFG[-_]/i.test(ret.serial) || /^SF[-_]/i.test(ret.productCode) ? 'semi' : 'finished';
  }

  getReturnTypeLabel(ret: ReturnedProductResponseDto): string {
    return this.getReturnType(ret) === 'semi' ? 'Semi-Finished' : 'Finished Goods';
  }

  setReturnTypeFilter(filter: 'all' | 'finished' | 'semi'): void {
    this.returnTypeFilter.set(filter);
    this.pagination.resetPage();
  }
  toggleSortDirection(): void {
    this.sortDirection.set(this.sortDirection() === 'desc' ? 'asc' : 'desc');
    this.pagination.resetPage();
  }

  pagedReturns = computed(() => {
    const data = this.filteredReturns();
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  pagedPendingApprovals = computed(() => {
    const data = this.returnService.pendingApprovals();
    const page = this.approvalPagination.currentPage();
    const size = this.approvalPagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  filteredRawMaterials = computed(() => {
    const term = this.rawMaterialSearchText().toLowerCase().trim();
    const all = this.masterData.RAW_ITEMS();
    if (!term) return all.slice(0, 10);
    return all
      .filter((r) => r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term))
      .slice(0, 10);
  });

  // NOTE: requires masterData.SEMI_ITEMS() to exist — see message below the code.
  filteredSemiMaterials = computed(() => {
    const term = this.rawMaterialSearchText().toLowerCase().trim();
    const all = this.masterData.SEMI_ITEMS();
    if (!term) return all.slice(0, 10);
    return all
      .filter(
        (r: any) => r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term),
      )
      .slice(0, 10);
  });

  ngOnInit() {
    if (this.embedded) this.activeTab.set('new');
    this.refreshData();
    if (!environment.production) {
      setTimeout(() => {
        if (!this.returnService.returns().length) {
          this.returnService.returns.set(DEMO_WORK_CENTER_RETURNS);
        }
        if (!this.returnService.pendingApprovals().length) {
          this.returnService.pendingApprovals.set(DEMO_WORK_CENTER_RETURNS.filter((item) => item.approvalStatusId === ReturnApprovalStatus.PendingCeo));
        }
      }, 700);
    }
  }

  refreshData() {
    this.returnService.fetchReturns();
    this.returnService.fetchPendingApprovals();
    this.masterData.fetchRawMaterials();
    // this.masterData.fetchSemiFinishedItems();  // add once available
    // this.masterData.fetchFinishedProducts();   // add once available
  }

  setTab(tab: 'logs' | 'new' | 'approvals' | 'returnToWarehouse') {
    this.activeTab.set(tab);
    if (tab === 'logs') {
      this.pagination.resetPage();
      this.returnService.fetchReturns();
    } else if (tab === 'approvals') {
      this.approvalPagination.resetPage();
      this.returnService.fetchPendingApprovals();
    }
  }
  submitReturnToWarehouse() {
    const f = this.returnToWarehouseForm;
    if (!f.serial.trim()) {
      alert('Please enter the serial number.');
      return;
    }

    this.isSubmittingReturnToWarehouse.set(true);
    this.returnService
      .returnToWarehouse({
        serial: f.serial.trim(),
        reason: '',
        isGood: true,
      })
      .subscribe({
        next: () => {
          this.isSubmittingReturnToWarehouse.set(false);
          this.toastService.show('Unit returned to warehouse successfully!');
          this.resetReturnToWarehouseForm();
          this.setTab('logs');
        },
        error: (err) => {
          this.isSubmittingReturnToWarehouse.set(false);
          console.error('Failed to return unit to warehouse:', err);
          alert(err?.error?.message || 'Failed to return unit to warehouse.');
        },
      });
  }
  resetReturnToWarehouseForm() {
    this.returnToWarehouseForm = {
      serial: '',
    };
  }
  toggleRowExpansion(id: number) {
    if (this.expandedReturnId() === id) {
      this.expandedReturnId.set(null);
    } else {
      this.expandedReturnId.set(id);
    }
  }

  // FIX: generalized so it works for either form (call with newReturnForm or oldReturnForm)
  onIsGoodChange(form: { isGood: boolean; action: ReturnAction }) {
    form.action = form.isGood ? ReturnAction.MoveToGood : ReturnAction.Recycle;
    this.workCenterStepConfirmed.set(false);
  }

  confirmWorkCenterStep() {
    this.workCenterStepConfirmed.set(true);
  }

  requiresWorkCenter(form: { isGood: boolean }): boolean {
    return !form.isGood;
  }

  verifySerial() {
    const serialNum = this.newReturnForm.serial.trim();
    if (!serialNum) {
      this.verificationError.set('Serial number cannot be empty.');
      return;
    }

    this.isVerifying.set(true);
    this.verificationError.set('');
    this.verificationNotice.set('');
    this.verifiedSerial.set(null);

    this.serialService.fetchBySerial(serialNum).subscribe({
      next: (data) => {
        this.isVerifying.set(false);
        if (data.status === 'Scrapped' || data.status === 3) {
          this.verificationError.set('This serial number unit is already scrapped.');
          return;
        }
        if (data.status === 'PendingCeoApproval' || data.status === 5) {
          this.verificationError.set('This serial number unit is already awaiting CEO approval.');
          return;
        }

        this.verifiedSerial.set(data);
        this.loadBomEntriesForProduct(data.finishedProductId, this.newReturnForm);
      },
      error: (err) => {
        this.isVerifying.set(false);
        const demoSerial = Object.values(this.returnProjectsByCustomer)
          .flatMap((projects) => projects.flatMap((project) => project.serials))
          .includes(serialNum);
        if (demoSerial) {
          const project = Object.values(this.returnProjectsByCustomer)
            .flatMap((projects) => projects)
            .find((candidate) => candidate.serials.includes(serialNum));
          this.verifiedSerial.set({
            serial: serialNum,
            finishedProductId: 1,
            finishedProductName: 'Control Panel 100',
            finishedProductCode: 'FP-TEST-001',
            finishedProduct: { name: 'Control Panel 100', code: 'FP-TEST-001', modelType: 'MTS' },
            status: 'InStock',
            projectName: project?.name,
            demo: true,
          });
          this.verificationNotice.set('Demo serial loaded locally because the API is unavailable.');
          return;
        }
        this.verificationError.set(err?.error?.message || 'Serial number not found in registry.');
      },
    });
  }

  // FIX: now takes the target form as a parameter (tracked flow passes newReturnForm,
  // old-serial flow passes oldReturnForm) and produces properly-shaped MaterialLine objects,
  // instead of the old { rawMaterialId, rawMaterialName, rawMaterialCode } shape that
  // silently dropped out of submitReturn()'s split logic.
  loadBomEntriesForProduct(productId: number, form: MaterialsFormLike) {
    if (!productId) return;
    this.http.get<any[]>(`${environment.apiUrl}/Bom/product/${productId}`).subscribe({
      next: (bomEntries) => {
        const items: MaterialLine[] = bomEntries.map((b) => {
          if (b.semiFinishedId) {
            const sf = this.masterData.SEMI_ITEMS().find((s: any) => s.id === b.semiFinishedId);
            return {
              kind: 'semi',
              semiFinishedId: b.semiFinishedId,
              name: b.semiFinishedName || sf?.name || 'Semi-Finished Item',
              code: b.semiFinishedCode || sf?.code || '',
              quantity: b.qtyPerUnit || 1,
              unit: sf?.unit || b.semiFinished?.unit || 'pcs',
            };
          }
          const rm = this.masterData.RAW_ITEMS().find((r) => r.id === b.rawMaterialId);
          return {
            kind: 'raw',
            rawMaterialId: b.rawMaterialId,
            name: b.rawMaterialName || rm?.name || 'Raw Material',
            code: b.rawMaterialCode || rm?.code || '',
            quantity: b.qtyPerUnit || 1,
            unit: rm?.unit || b.rawMaterial?.unit || 'pcs',
          };
        });

        form.recoveredMaterials = [...items];
        form.maintenanceMaterials = [...items];
      },
      error: (err) => {
        console.error('Failed to load BOM entries for return form pre-population:', err);
      },
    });
  }

  addMaterialLine(
    form: MaterialsFormLike,
    category: 'recovered' | 'maintenance',
    kind: 'raw' | 'semi',
    itemId: number,
  ) {
    const source = kind === 'raw' ? this.masterData.RAW_ITEMS() : this.masterData.SEMI_ITEMS();
    const item = source.find((r: any) => r.id === itemId);
    if (!item) return;

    const list = category === 'recovered' ? form.recoveredMaterials : form.maintenanceMaterials;

    if (
      list.some(
        (x) => x.kind === kind && (kind === 'raw' ? x.rawMaterialId : x.semiFinishedId) === itemId,
      )
    ) {
      this.toastService.show('Material already in the list.');
      this.showRawMaterialDropdown.set(null);
      return;
    }

    list.push({
      kind,
      rawMaterialId: kind === 'raw' ? item.id : undefined,
      semiFinishedId: kind === 'semi' ? item.id : undefined,
      name: item.name,
      code: item.code,
      quantity: 1,
      unit: item.unit,
    });

    this.showRawMaterialDropdown.set(null);
    this.rawMaterialSearchText.set('');
  }

  // FIX: generalized to accept the target form, so it works for oldReturnForm too.
  removeMaterialLine(
    form: MaterialsFormLike,
    category: 'recovered' | 'maintenance',
    index: number,
  ) {
    const list = category === 'recovered' ? form.recoveredMaterials : form.maintenanceMaterials;
    list.splice(index, 1);
  }

  getUserId(): number {
    const token = this.authService.getToken();
    if (!token) return 1;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return 1;
      const payload = JSON.parse(atob(parts[1]));

      const claimKeys = [
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
        'nameid',
        'userId',
        'id',
        'sub',
      ];

      for (const key of claimKeys) {
        const val = payload[key];
        if (val !== undefined && val !== null) {
          const parsed = Number(val);
          if (!isNaN(parsed) && parsed > 0) {
            return parsed;
          }
        }
      }
      return 1;
    } catch (e) {
      console.error('Error decoding token for user ID:', e);
      return 1;
    }
  }

  submitReturn() {
    const f = this.newReturnForm;
    if (!f.customerName) {
      alert('Please select the customer for this return.');
      return;
    }
    if (!f.reason.trim()) {
      alert('Please enter the reason for this return.');
      return;
    }
    if (this.requiresWorkCenter(f) && !this.workCenterStepConfirmed()) {
      alert('Complete the Work Center step before saving this damaged return.');
      return;
    }
    if (!this.verifiedSerial()) {
      alert('Please enter and verify a valid serial number.');
      return;
    }

    const payload: CreateReturnedProductDto = {
      serial: f.serial.trim(),
      reason: f.reason.trim(),
      isGood: f.isGood,
      action: Number(f.action) as ReturnAction,
    };

    const splitLines = (lines: MaterialLine[]) => ({
      raw: lines
        .filter((m) => m.kind === 'raw' && m.quantity > 0)
        .map((m) => ({ rawMaterialId: m.rawMaterialId!, quantity: Number(m.quantity) })),
      semi: lines
        .filter((m) => m.kind === 'semi' && m.quantity > 0)
        .map((m) => ({ semiFinishedId: m.semiFinishedId!, quantity: Number(m.quantity) })),
    });

    if (payload.action === ReturnAction.Recycle) {
      const { raw, semi } = splitLines(f.recoveredMaterials);
      payload.recoveredRawMaterials = raw;
      payload.recoveredSemiFinisheds = semi;
      if (raw.length + semi.length === 0) {
        alert('Recycle action requires at least one recovered material with quantity > 0.');
        return;
      }
    }

    if (payload.action === ReturnAction.Maintain) {
      const { raw, semi } = splitLines(f.maintenanceMaterials);
      // FIX: was payload.maintenanceMaterials (doesn't exist on the DTO) — must be maintenanceRawMaterials
      payload.maintenanceRawMaterials = raw;
      payload.maintenanceSemiFinisheds = semi;
      if (raw.length + semi.length === 0) {
        alert('Maintenance action requires at least one replacement material with quantity > 0.');
        return;
      }
    }

    this.returnService.createReturn(payload).subscribe({
      next: () => {
        this.toastService.show('Return logged and processed successfully!');
        this.resetReturnForm();
        this.setTab('logs');
      },
      error: (err) => {
        console.error('Failed to log product return:', err);
        alert(err?.error?.message || 'Failed to log product return.');
      },
    });
  }

  // FIX: now populates oldReturnForm, not newReturnForm.
  onFinishedProductPicked(productId: number) {
    this.oldReturnForm.finishedProductId = productId;
    this.loadBomEntriesForProduct(productId, this.oldReturnForm);
  }

  submitOldSerialReturn() {
    const f = this.oldReturnForm;
    if (this.requiresWorkCenter(f) && !this.workCenterStepConfirmed()) {
      alert('Complete the Work Center step before saving this damaged return.');
      return;
    }
    if (!f.finishedProductId) {
      alert('Please select the finished product.');
      return;
    }
    if (!f.oldSerial.trim()) {
      alert('Please enter the old serial / reference number.');
      return;
    }

    const toLines = (lines: MaterialLine[]) =>
      lines
        .filter((m) => m.quantity > 0)
        .map((m) => ({
          rawMaterialId: m.kind === 'raw' ? m.rawMaterialId : undefined,
          semiFinishedId: m.kind === 'semi' ? m.semiFinishedId : undefined,
          quantity: Number(m.quantity),
        }));

    const payload: CreateReturnedProductOldSerialDto = {
      finishedProductId: f.finishedProductId,
      oldSerial: f.oldSerial.trim(),
      reason: f.reason.trim(),
      isGood: f.isGood,
      action: Number(f.action) as ReturnAction,
    };

    if (payload.action === ReturnAction.Recycle) {
      payload.recoveredMaterials = toLines(f.recoveredMaterials);
      if (!payload.recoveredMaterials.length) {
        alert('Recycle action requires at least one recovered material with quantity > 0.');
        return;
      }
    }
    if (payload.action === ReturnAction.Maintain) {
      payload.maintenanceMaterials = toLines(f.maintenanceMaterials);
      if (!payload.maintenanceMaterials.length) {
        alert('Maintenance action requires at least one replacement material with quantity > 0.');
        return;
      }
    }

    this.returnService.createReturnForOldSerial(payload).subscribe({
      next: (res) => {
        this.toastService.show(`Return logged. New serial issued: ${res.serial}`);
        this.resetOldReturnForm();
        this.setTab('logs');
      },
      error: (err) => {
        console.error('Failed to log old-unit return:', err);
        alert(err?.error?.message || 'Failed to log old-unit return.');
      },
    });
  }

  resetOldReturnForm() {
    this.oldReturnForm = {
      finishedProductId: null,
      oldSerial: '',
      reason: '',
      isGood: true,
      action: ReturnAction.MoveToGood,
      recoveredMaterials: [],
      maintenanceMaterials: [],
    };
    this.workCenterStepConfirmed.set(false);
  }

  resetReturnForm() {
    this.newReturnForm = {
      serial: '',
      customerName: '',
      projectName: '',
      reason: '',
      isGood: true,
      action: ReturnAction.MoveToGood,
      recoveredMaterials: [],
      maintenanceMaterials: [],
    };
    this.workCenterStepConfirmed.set(false);
    this.verifiedSerial.set(null);
    this.verificationError.set('');
    this.verificationNotice.set('');
  }

  openApprovalModal(ret: ReturnedProductResponseDto) {
    this.selectedReturnForApproval.set(ret);
    this.approvalForm = {
      isApproved: true,
      notes: '',
    };
  }

  closeApprovalModal() {
    this.selectedReturnForApproval.set(null);
  }

  submitApprovalDecision() {
    const ret = this.selectedReturnForApproval();
    if (!ret) return;

    const dto: ApproveScrapDto = {
      isApproved: this.approvalForm.isApproved,
      notes: this.approvalForm.notes.trim() || undefined,
      ceoUserId: this.getUserId(),
    };

    this.returnService.approveScrap(ret.id, dto).subscribe({
      next: () => {
        const actionText = this.approvalForm.isApproved ? 'approved' : 'rejected';
        this.toastService.show(`Scrap request ${actionText} successfully!`);
        this.closeApprovalModal();
        this.refreshData();
      },
      error: (err) => {
        console.error('Failed to approve/reject scrap request:', err);
        alert(err?.error?.message || 'Failed to submit approval decision.');
      },
    });
  }
  // ---------- edit reason ----------

  openEditReasonModal(ret: ReturnedProductResponseDto) {
    this.editingReasonReturn.set(ret);
    this.editReasonText.set(ret.reason || '');
  }
  goToReturnForSerial(ret: ReturnedProductResponseDto) {
    this.registrationMode.set('tracked');
    this.resetReturnForm();
    this.newReturnForm.serial = ret.serial;
    this.setTab('new');
    this.verifySerial();
  }
  closeEditReasonModal() {
    this.editingReasonReturn.set(null);
    this.editReasonText.set('');
  }

  submitReasonEdit() {
    const ret = this.editingReasonReturn();
    if (!ret) return;

    const reason = this.editReasonText().trim();
    if (!reason) {
      alert('Please enter a reason.');
      return;
    }

    this.isSavingReason.set(true);
    this.returnService.updateReason(ret.id, reason).subscribe({
      next: () => {
        this.isSavingReason.set(false);
        this.toastService.show('Reason updated successfully!');
        this.closeEditReasonModal();
      },
      error: (err) => {
        this.isSavingReason.set(false);
        console.error('Failed to update reason:', err);
        alert(err?.error?.message || 'Failed to update reason.');
      },
    });
  }
}
