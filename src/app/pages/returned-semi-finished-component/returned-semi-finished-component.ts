import { Component, OnInit, inject, ChangeDetectorRef, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReturnWarehouseComponent } from '../return-warehouse/return-warehouse.component';
import { AuthService } from '../../services/auth.service'; // TODO: adjust path if needed
import { ReturnedSemiFinishedService } from '../../services/returned-semi-finished.service';
import { SemiFinishedService } from '../../services/semi-finished.service'; // NEW
import { SemiFinished } from '../../models/Semi-finished.dto'; // NEW
import { MasterDataService } from '../../services/master-data.service';
import { environment } from '../../../environments/environment';
import {
  ReturnedSemiFinished,
  CreateReturnedSemiFinishedDto,
  ReturnedSemiFinishedActionEnum,
  RawMaterialLine,
} from '../../models/Returned-semi-finished.dto';

type TabKey = 'registry' | 'log' | 'pending';

interface WorkCenterReturn {
  id: number;
  type: 'Finished Goods' | 'Semi-Finished';
  serial: string;
  product: string;
  code: string;
  condition: 'Good' | 'Damaged';
  status: 'Ready for review' | 'In maintenance' | 'Waiting for materials' | 'Ready to return' | 'Pending approval';
  reason: string;
  assignedTo?: string;
}

interface ScrapRegistryItem {
  serial: string;
  product: string;
  customer: string;
  reason: string;
  requestedBy: string;
  status: 'Pending Approval' | 'Approved' | 'Rejected' | 'Processed';
  date: string;
}

interface WorkCenterMaterial {
  name: string;
  code: string;
  quantity: number;
  unit: string;
}

const DEMO_WORK_CENTER_QUEUE: WorkCenterReturn[] = [
  { id: 9201, type: 'Semi-Finished', serial: 'SFG-CTRL-000008', product: 'Control Module', code: 'SF-CTRL-210', condition: 'Damaged', status: 'Ready for review', reason: 'Connector needs replacement' },
  { id: 9202, type: 'Finished Goods', serial: 'MTS-CP100-000005', product: 'Control Panel 100', code: 'FP-TEST-001', condition: 'Good', status: 'Ready for review', reason: 'Customer returned after inspection' },
  { id: 9203, type: 'Semi-Finished', serial: 'SFG-DRV-000021', product: 'Drive Unit', code: 'SFG-DU-400', condition: 'Damaged', status: 'Waiting for materials', reason: 'Housing replacement required' },
];

const DEMO_SCRAP_REGISTRY: ScrapRegistryItem[] = [
  { serial: 'MTS-PQB-000001', product: 'Power Quality Beacon', customer: 'Atlas Manufacturing', reason: 'Burnt board and damaged enclosure', requestedBy: 'Technical Team', status: 'Pending Approval', date: 'Oct 14, 2026' },
  { serial: 'MTO-IG200-000015', product: 'Industrial Gateway', customer: 'Nile Telecom', reason: 'Unit beyond repair', requestedBy: 'Warehouse Team', status: 'Approved', date: 'Oct 12, 2026' },
  { serial: 'SFG-IG-300-000004', product: 'Industrial Gateway Module', customer: 'Delta Energy', reason: 'Failed final inspection', requestedBy: 'Work Center', status: 'Processed', date: 'Oct 10, 2026' },
];

// Development-only records so the screen can be reviewed before the API has data.
const DEMO_RETURNED_SEMI_FINISHED: ReturnedSemiFinished[] = [
  {
    id: 8101, semiFinishedId: 101, semiFinishedName: 'Control Module', semiFinishedCode: 'SFG-CM-100',
    reason: 'Returned after inspection with a loose connector', isGood: true,
    actionId: ReturnedSemiFinishedActionEnum.MoveToGood, action: 'Move To Good', approvalStatusId: 1,
    approvalStatus: 'NotRequired', approvalNotes: null, approvedByName: null, approvedAt: null,
    isResolved: true, createdAt: '2026-10-16T10:30:00', recoveredMaterials: [], maintenanceMaterials: [],
  },
  {
    id: 8102, semiFinishedId: 102, semiFinishedName: 'Power Quality Beacon', semiFinishedCode: 'SFG-PQB-200',
    reason: 'Needs connector replacement before release', isGood: false,
    actionId: ReturnedSemiFinishedActionEnum.Maintain, action: 'Maintain', approvalStatusId: 1,
    approvalStatus: 'NotRequired', approvalNotes: null, approvedByName: null, approvedAt: null,
    isResolved: false, createdAt: '2026-10-15T14:10:00', recoveredMaterials: [],
    maintenanceMaterials: [{ rawMaterialId: 22, rawMaterialName: 'Copper Wire', quantity: 2 }],
  },
  {
    id: 8103, semiFinishedId: 103, semiFinishedName: 'Industrial Gateway', semiFinishedCode: 'SFG-IG-300',
    reason: 'Burnt board and damaged enclosure', isGood: false,
    actionId: ReturnedSemiFinishedActionEnum.ScrapWithApproval, action: 'Scrap With Approval', approvalStatusId: 2,
    approvalStatus: 'PendingCeo', approvalNotes: null, approvedByName: null, approvedAt: null,
    isResolved: false, createdAt: '2026-10-14T09:45:00', recoveredMaterials: [], maintenanceMaterials: [],
  },
  {
    id: 8104, semiFinishedId: 104, semiFinishedName: 'Drive Unit', semiFinishedCode: 'SFG-DU-400',
    reason: 'Unit beyond repair; usable parts recovered', isGood: false,
    actionId: ReturnedSemiFinishedActionEnum.Recycle, action: 'Recycle', approvalStatusId: 3,
    approvalStatus: 'Approved', approvalNotes: 'Approved for material recovery', approvedByName: 'Azab',
    approvedAt: '2026-10-13T16:20:00', isResolved: true, createdAt: '2026-10-13T11:15:00',
    recoveredMaterials: [{ rawMaterialId: 31, rawMaterialName: 'Steel Sheet', quantity: 1 }], maintenanceMaterials: [],
  },
];

const DEMO_SEMI_FINISHED_ITEMS: SemiFinished[] = [
  { id: 101, code: 'SFG-CM-100', name: 'Control Module', modelType: 'MTS', currentStock: 18, totalProduced: 42, lastProductionDate: '2026-10-16T10:30:00' },
  { id: 102, code: 'SFG-PQB-200', name: 'Power Quality Beacon', modelType: 'MTO', currentStock: 9, totalProduced: 24, lastProductionDate: '2026-10-15T14:10:00' },
  { id: 103, code: 'SFG-IG-300', name: 'Industrial Gateway', modelType: 'MTO', currentStock: 5, totalProduced: 16, lastProductionDate: '2026-10-14T09:45:00' },
  { id: 104, code: 'SFG-DU-400', name: 'Drive Unit', modelType: 'MTS', currentStock: 12, totalProduced: 31, lastProductionDate: '2026-10-13T11:15:00' },
];

@Component({
  selector: 'app-returned-semi-finished',
  standalone: true,
  imports: [CommonModule, FormsModule, ReturnWarehouseComponent],
  templateUrl: './returned-semi-finished-component.html',
  styleUrl: './returned-semi-finished-component.css',
})
export class ReturnedSemiFinishedComponent implements OnInit {
  private service = inject(ReturnedSemiFinishedService);
  private semiFinishedService = inject(SemiFinishedService); // NEW
  private authService = inject(AuthService);
  masterData = inject(MasterDataService);
  private cdr = inject(ChangeDetectorRef);

  activeTab = signal<'registry' | 'log' | 'workCenter' | 'pending' | 'finishedActions' | 'scrapRegistry'>('registry');
  workCenterStepConfirmed = false;
  items: ReturnedSemiFinished[] = [];
  searchTerm = '';
  loading = false;
  error: string | null = null;

  // NEW: Semi-Finished Products list, used to populate the dropdown in the "Log Return" form
  semiFinishedItems: SemiFinished[] = [];
  semiFinishedSearch = '';
  loadingSemiFinished = false;

  // Backend approvalStatus values: 'NotRequired' | 'PendingCeo' | 'Approved' | 'Rejected'
  private readonly PENDING_STATUS = 'PendingCeo';

  readonly actionOptions = [
    { value: ReturnedSemiFinishedActionEnum.MoveToGood, label: 'Move To Good' },
    { value: ReturnedSemiFinishedActionEnum.Recycle, label: 'Recover Materials' },
    { value: ReturnedSemiFinishedActionEnum.Maintain, label: 'Maintain' },
    {
      value: ReturnedSemiFinishedActionEnum.ScrapWithApproval,
      label: 'Scrap',
    },
  ];

  readonly ReturnedSemiFinishedActionEnum = ReturnedSemiFinishedActionEnum;

  // --- Log Return form state ---
  form: CreateReturnedSemiFinishedDto = this.emptyForm();
  submitting = false;
  submitError: string | null = null;
  submitSuccess = false;

  // --- Pending approval action state ---
  approvingId: number | null = null;
  approvalNotes = '';

  // --- Edit Reason state (registry table) ---
  editingReasonItem: ReturnedSemiFinished | null = null;
  editReasonText = '';
  isSavingReason = false;

  workCenterQueue = DEMO_WORK_CENTER_QUEUE.map((item) => ({ ...item }));
  selectedWorkCenterItem: WorkCenterReturn | null = null;
  workCenterCondition: 'Good' | 'Damaged' = 'Damaged';
  workCenterAction: 'Return to stock' | 'Maintenance' | 'Scrap' = 'Maintenance';
  workCenterDestination: 'MTS' | 'MTO' = 'MTS';
  workCenterSerialPolicy: 'New Serial' | 'Keep Existing Serial' = 'New Serial';
  workCenterMaterials: WorkCenterMaterial[] = [];
  workCenterMessage = '';
  workCenterAssignee = '';
  readonly workCenterAssignees = ['Khaled Hassan', 'Ahmed Samir', 'Technical Team'];
  readonly scrapRegistry = DEMO_SCRAP_REGISTRY;

  currentUserRoles = computed(() => {
    const user = this.authService.getUser();
    return (user?.roles || []).map((r) => r.toLowerCase());
  });

  isCeo = computed(() => this.currentUserRoles().includes('ceo'));
  isAdmin = computed(() => this.currentUserRoles().includes('admin'));
  isEngineer = computed(() => this.currentUserRoles().includes('engineer'));
  isAccountant = computed(() => this.currentUserRoles().includes('accountant'));
  canViewApprovalsTab = computed(() => this.isCeo() || this.isEngineer());

  ngOnInit(): void {
    this.loadItems();
    this.loadSemiFinishedItems(); // NEW
    if (!environment.production) {
      setTimeout(() => {
        if (!this.items.length) {
          this.items = DEMO_RETURNED_SEMI_FINISHED.map((item) => ({ ...item }));
          this.error = null;
          this.loading = false;
        }
        if (!this.semiFinishedItems.length) {
          this.semiFinishedItems = DEMO_SEMI_FINISHED_ITEMS.map((item) => ({ ...item }));
          this.loadingSemiFinished = false;
        }
        this.cdr.detectChanges();
      }, 700);
    }
    this.cdr.detectChanges();
  }

  loadItems(): void {
    this.loading = true;
    this.error = null;
    this.service.getAll().subscribe({
      next: (data) => {
        this.items = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load returned semi-finished items.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // NEW: fetches Semi-Finished Products to populate the dropdown in the Log Return form
  loadSemiFinishedItems(): void {
    this.loadingSemiFinished = true;
    this.semiFinishedService.getAll().subscribe({
      next: (data) => {
        this.semiFinishedItems = data;
        this.loadingSemiFinished = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingSemiFinished = false;
        this.cdr.detectChanges();
      },
    });
  }

  onSemiFinishedSearchChange(value: string): void {
    this.semiFinishedSearch = value;
    const normalized = value.trim().toLowerCase();
    const selected = this.semiFinishedItems.find((item) => {
      const label = `${item.code} - ${item.name} (${item.modelType})`.toLowerCase();
      return label === normalized || item.code.toLowerCase() === normalized || item.name.toLowerCase() === normalized;
    });
    this.form.semiFinishedId = selected?.id ?? 0;
  }

  setTab(tab: 'registry' | 'log' | 'workCenter' | 'pending' | 'finishedActions' | 'scrapRegistry') {
    this.activeTab.set(tab);
  }

  openWorkCenterItem(item: WorkCenterReturn): void {
    this.selectedWorkCenterItem = item;
    this.workCenterCondition = item.condition;
    this.workCenterAction = item.condition === 'Good' ? 'Return to stock' : 'Maintenance';
    this.workCenterDestination = 'MTS';
    this.workCenterSerialPolicy = 'New Serial';
    this.workCenterMessage = '';
    this.workCenterAssignee = item.assignedTo || '';
    this.workCenterMaterials = item.condition === 'Damaged'
      ? [{ name: 'Copper Wire', code: 'RM-002', quantity: 2, unit: 'M' }]
      : [];
  }

  closeWorkCenterItem(): void {
    this.selectedWorkCenterItem = null;
    this.workCenterMessage = '';
  }

  onWorkCenterConditionChange(): void {
    this.workCenterAction = this.workCenterCondition === 'Good' ? 'Return to stock' : 'Maintenance';
    if (this.workCenterCondition === 'Good') this.workCenterMaterials = [];
  }

  completeWorkCenterStep(): void {
    const item = this.selectedWorkCenterItem;
    if (!item) return;
    if (!this.workCenterAssignee) {
      this.workCenterMessage = 'Assign a technician before continuing.';
      return;
    }

    if (this.workCenterCondition === 'Damaged' && this.workCenterAction === 'Maintenance' && this.workCenterMaterials.length === 0) {
      this.workCenterMessage = 'Add the BOM materials required for maintenance before continuing.';
      return;
    }

    item.condition = this.workCenterCondition;
    item.assignedTo = this.workCenterAssignee;
    item.status = this.workCenterAction === 'Scrap' ? 'Pending approval' : 'Ready to return';
    this.workCenterMessage = item.status === 'Pending approval'
      ? 'Scrap request created and sent to Pending Approvals.'
      : `Ready to return to ${this.workCenterDestination} with ${this.workCenterSerialPolicy.toLowerCase()}.`;
  }

  get filteredItems(): ReturnedSemiFinished[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.items;
    return this.items.filter(
      (i) =>
        i.semiFinishedName?.toLowerCase().includes(term) ||
        i.semiFinishedCode?.toLowerCase().includes(term) ||
        i.action?.toLowerCase().includes(term) ||
        i.approvalStatus?.toLowerCase().includes(term),
    );
  }

  get totalRegistered(): number {
    return this.items.length;
  }

  get pendingApprovalsCount(): number {
    return this.items.filter((i) => i.approvalStatus === this.PENDING_STATUS).length;
  }

  get resolvedCount(): number {
    return this.items.filter((i) => i.isResolved).length;
  }

  get scrapApprovedCount(): number {
    return this.items.filter((i) => i.approvalStatus === 'Approved' && !i.isGood).length;
  }

  get pendingItems(): ReturnedSemiFinished[] {
    return this.items.filter((i) => i.approvalStatus === this.PENDING_STATUS);
  }

  // --- Log Return form helpers ---
  private emptyForm(): CreateReturnedSemiFinishedDto {
    return {
      semiFinishedId: 0,
      reason: '',
      isGood: true,
      action: ReturnedSemiFinishedActionEnum.MoveToGood,
      recoveredRawMaterials: [],
      maintenanceRawMaterials: [],
    };
  }

  get showRecoveredMaterials(): boolean {
    return this.form.action === ReturnedSemiFinishedActionEnum.Recycle;
  }

  get availableActionOptions() {
    return this.form.isGood
      ? this.actionOptions.filter((option) => option.value === ReturnedSemiFinishedActionEnum.MoveToGood)
      : this.actionOptions.filter((option) => option.value !== ReturnedSemiFinishedActionEnum.MoveToGood);
  }

  get showMaintenanceMaterials(): boolean {
    return this.form.action === ReturnedSemiFinishedActionEnum.Maintain;
  }

  get isScrapAction(): boolean {
    return this.form.action === ReturnedSemiFinishedActionEnum.ScrapWithApproval;
  }

  onConditionChange(): void {
    this.workCenterStepConfirmed = false;
    if (this.form.isGood) {
      this.form.action = ReturnedSemiFinishedActionEnum.MoveToGood;
      this.form.recoveredRawMaterials = [];
      this.form.maintenanceRawMaterials = [];
      return;
    }

    // A damaged return must be intentionally assigned to a handling path.
    this.form.action = 0;
    this.form.recoveredRawMaterials = [];
    this.form.maintenanceRawMaterials = [];
  }

  onActionChange(): void {
    this.workCenterStepConfirmed = false;
    if (this.form.isGood) {
      this.form.action = ReturnedSemiFinishedActionEnum.MoveToGood;
    }
    if (!this.showRecoveredMaterials) {
      this.form.recoveredRawMaterials = [];
    }
    if (!this.showMaintenanceMaterials) {
      this.form.maintenanceRawMaterials = [];
    }
    if (this.isScrapAction) {
      this.form.isGood = false;
    }
  }

  addRecoveredMaterialRow(): void {
    this.form.recoveredRawMaterials.push({ rawMaterialId: 0, quantity: 0 });
  }

  removeRecoveredMaterialRow(index: number): void {
    this.form.recoveredRawMaterials.splice(index, 1);
  }

  addMaintenanceMaterialRow(): void {
    this.form.maintenanceRawMaterials.push({ rawMaterialId: 0, quantity: 0 });
  }

  removeMaintenanceMaterialRow(index: number): void {
    this.form.maintenanceRawMaterials.splice(index, 1);
  }

  getRawMaterialLabel(line: RawMaterialLine): string {
    const item = this.masterData.RAW_ITEMS().find((raw) => raw.id === line.rawMaterialId);
    return item ? `${item.code} - ${item.name}` : line.rawMaterialName || '';
  }

  getRawMaterialUnit(rawMaterialId: number): string {
    return this.masterData.RAW_ITEMS().find((raw) => raw.id === rawMaterialId)?.unit || '-';
  }

  getRawMaterialStock(rawMaterialId: number): number | null {
    const item = this.masterData.RAW_ITEMS().find((raw) => raw.id === rawMaterialId);
    return item ? item.currentStock : null;
  }

  onRawMaterialInput(line: RawMaterialLine, value: string): void {
    const normalized = value.trim().toLowerCase();
    const selected = this.masterData.RAW_ITEMS().find((raw) => {
      const label = `${raw.code} - ${raw.name}`.toLowerCase();
      return label === normalized || raw.code.toLowerCase() === normalized || raw.name.toLowerCase() === normalized;
    });
    line.rawMaterialId = selected?.id ?? 0;
    line.rawMaterialName = selected?.name;
  }

  submitReturn(): void {
    if (!this.form.semiFinishedId) {
      this.submitError = 'Semi-finished item is required.';
      return;
    }
    if (!this.form.reason.trim()) {
      this.submitError = 'Reason is required.';
      return;
    }
    if (!this.form.action) {
      this.submitError = 'Choose an action for this damaged return.';
      return;
    }
    if (!this.form.isGood && !this.workCenterStepConfirmed) {
      this.submitError = 'Complete the Work Center step before saving this damaged return.';
      return;
    }
    const materialLines = this.showMaintenanceMaterials
      ? this.form.maintenanceRawMaterials
      : this.showRecoveredMaterials
        ? this.form.recoveredRawMaterials
        : [];
    if (materialLines.some((line) => !line.rawMaterialId || line.quantity <= 0)) {
      this.submitError = 'Choose a raw material and enter a quantity greater than zero.';
      return;
    }

    this.submitting = true;
    this.submitError = null;
    this.submitSuccess = false;

    this.service.create(this.form).subscribe({
      next: () => {
        this.submitting = false;
        this.submitSuccess = true;
        this.form = this.emptyForm();
        this.workCenterStepConfirmed = false;
        this.semiFinishedSearch = '';
        this.loadItems();
        this.setTab('registry');
      },
      error: () => {
        this.submitting = false;
        this.submitError = 'Failed to log the return. Please try again.';
      },
    });
  }

  confirmWorkCenterStep(): void {
    this.workCenterStepConfirmed = true;
    this.submitError = null;
  }

  // --- Edit Reason (registry table) ---

  openEditReasonModal(item: ReturnedSemiFinished): void {
    console.log('opening modal for', item); // مؤقت للتأكد
    this.editingReasonItem = item;
    this.editReasonText = item.reason || '';
  }
  closeEditReasonModal(): void {
    this.editingReasonItem = null;
    this.editReasonText = '';
  }

  submitReasonEdit(): void {
    if (!this.editingReasonItem) return;

    const reason = this.editReasonText.trim();
    if (!reason) {
      this.error = 'Please enter a reason.';
      return;
    }

    this.isSavingReason = true;
    this.service.updateReason(this.editingReasonItem.id, reason).subscribe({
      next: () => {
        this.isSavingReason = false;
        this.closeEditReasonModal();
        this.loadItems();
      },
      error: () => {
        this.isSavingReason = false;
        this.error = 'Failed to update the reason.';
      },
    });
  }

  // --- Pending approvals ---
  startApproval(item: ReturnedSemiFinished): void {
    this.approvingId = item.id;
    this.approvalNotes = '';
  }

  cancelApproval(): void {
    this.approvingId = null;
    this.approvalNotes = '';
  }

  confirmApproval(isApproved: boolean): void {
    if (this.approvingId == null) return;

    // TODO: replace with the actual property that holds the logged-in user's numeric id
    const ceoUserId = (this.authService as any).currentUser?.id ?? 0;

    this.service
      .approveScrap(this.approvingId, {
        isApproved,
        notes: this.approvalNotes,
        ceoUserId,
      })
      .subscribe({
        next: () => {
          this.cancelApproval();
          this.loadItems();
        },
        error: () => {
          this.error = 'Failed to submit the approval decision.';
        },
      });
  }
}
