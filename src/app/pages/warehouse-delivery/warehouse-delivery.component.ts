import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DeliveryRequestService } from '../../services/delivery-request.service';
import { ToastService } from '../../services/toast.service';
import { WarehousePendingRequest } from '../../models/delivery-request.dto';

type Tab = 'pending' | 'approved';

@Component({
  selector: 'app-warehouse-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './warehouse-delivery.component.html',
  styleUrls: ['../customers/customers.component.css'],
})
export class WarehouseDeliveryComponent implements OnInit {
  private readonly service = inject(DeliveryRequestService);
  private readonly toast = inject(ToastService);

  readonly activeTab = signal<Tab>('pending');

  readonly requests = signal<WarehousePendingRequest[]>([]);          // pending
  readonly approvedRequests = signal<WarehousePendingRequest[]>([]);  // approved
  readonly loading = signal(false);

  readonly selected = signal<WarehousePendingRequest | null>(null);
  readonly detailsLoading = signal(false);

  readonly deciding = signal(false);
  readonly uploading = signal(false);

  comment = '';
  readonly approvedId = signal<number | null>(null);
  pendingFile: File | null = null;

  // القائمة الحالية حسب التاب
  readonly currentList = () =>
    this.activeTab() === 'pending' ? this.requests() : this.approvedRequests();

  ngOnInit(): void {
    this.loadPending();
    this.loadApproved();
  }

  setTab(tab: Tab): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.resetSelection();
    this.refresh();
  }

  refresh(): void {
    this.activeTab() === 'pending' ? this.loadPending() : this.loadApproved();
  }

  private resetSelection(): void {
    this.selected.set(null);
    this.approvedId.set(null);
    this.pendingFile = null;
    this.comment = '';
  }

  loadPending(selectId?: number): void {
    this.loading.set(true);
    this.service.getWarehousePending().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : [];
        this.requests.set(list);
        this.loading.set(false);

        if (this.activeTab() !== 'pending') return;

        const keep = selectId ?? this.selected()?.id;
        const target = list.find((r) => r.id === keep) ?? null;
        if (target) {
          this.selected.set(target);
        } else if (this.approvedId() === null) {
          this.selected.set(null);
        }
      },
      error: (error) => {
        console.error('Failed to load pending requests:', error);
        this.loading.set(false);
        this.toast.show(this.errorMessage(error, 'Failed to load pending requests.'));
      },
    });
  }

  loadApproved(): void {
    this.loading.set(true);
    this.service.getWarehouseApproved().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : [];
        this.approvedRequests.set(list);
        this.loading.set(false);

        if (this.activeTab() !== 'approved') return;

        const keep = this.selected()?.id;
        const target = list.find((r) => r.id === keep) ?? null;
        this.selected.set(target);
        if (!target) {
          this.approvedId.set(null);
        }
      },
      error: (error) => {
        console.error('Failed to load approved requests:', error);
        this.loading.set(false);
        this.toast.show(this.errorMessage(error, 'Failed to load approved requests.'));
      },
    });
  }

  select(request: WarehousePendingRequest): void {
    this.comment = '';
    this.pendingFile = null;
    // في تاب Approved نفتح مباشرة قسم رفع الورقة
    this.approvedId.set(this.activeTab() === 'approved' ? request.id : null);
    this.detailsLoading.set(true);
    this.selected.set(request);

    this.service.getWarehouseRequestById(request.id).subscribe({
      next: (details) => {
        this.selected.set(details);
        this.detailsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load request details:', error);
        this.detailsLoading.set(false);
        this.toast.show(this.errorMessage(error, 'Failed to load request details.'));
      },
    });
  }

  decide(isApproved: boolean): void {
    const request = this.selected();
    if (!request) return;

    if (!isApproved && !this.comment.trim()) {
      this.toast.show('Please add a comment explaining the rejection.');
      return;
    }

    this.deciding.set(true);
    this.service
      .warehouseDecision(request.id, { isApproved, comment: this.comment.trim() })
      .subscribe({
        next: () => {
          this.deciding.set(false);
          if (isApproved) {
            this.toast.show(`${request.requestNumber} approved. Upload the signed delivery paper.`);
            this.approvedId.set(request.id);
          } else {
            this.toast.show(`${request.requestNumber} rejected.`);
            this.selected.set(null);
          }
          this.comment = '';
          this.loadPending(isApproved ? request.id : undefined);
          this.loadApproved();
        },
        error: (error) => {
          console.error('Warehouse decision failed:', error);
          this.deciding.set(false);
          this.toast.show(this.errorMessage(error, 'Failed to save the decision.'));
        },
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.pendingFile = input.files?.[0] ?? null;
  }

  uploadSigned(): void {
    const id = this.approvedId();
    if (!id || !this.pendingFile) {
      this.toast.show('Choose the signed delivery paper first.');
      return;
    }

    this.uploading.set(true);
    this.service.uploadSignedDocument(id, this.pendingFile).subscribe({
      next: () => {
        this.uploading.set(false);
        this.toast.show('Signed delivery paper uploaded.');
        this.pendingFile = null;
        this.approvedId.set(null);
        this.selected.set(null);
        this.loadPending();
        this.loadApproved();
      },
      error: (error) => {
        console.error('Failed to upload signed document:', error);
        this.uploading.set(false);
        this.toast.show(this.errorMessage(error, 'Failed to upload signed document.'));
      },
    });
  }

  private errorMessage(error: any, fallback: string): string {
    const e = error?.error;
    return (typeof e === 'string' && e) || e?.message || e?.detail || e?.title || fallback;
  }
}
