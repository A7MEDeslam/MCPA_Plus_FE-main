import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkOrderMaterialRequirement, WorkOrderService } from '../../services/work-order.service';
import { MasterDataService } from '../../services/master-data.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../models/customer.models';
import { CustomerContractService } from '../../services/customer-contract.service';
import { CustomerContractSummary } from '../../models/customer-contract.dto';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-production-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './production-orders.component.html',
  styleUrl: './production-orders.component.css',
})
export class ProductionOrdersComponent implements OnInit {
  workOrderService = inject(WorkOrderService);
  masterData = inject(MasterDataService);
  router = inject(Router);
  toastService = inject(ToastService);
  authService = inject(AuthService);
  customerService = inject(CustomerService);
  customerContractService = inject(CustomerContractService);
  customers = signal<Customer[]>([]);
  customerContracts = signal<CustomerContractSummary[]>([]);
  customerContractsLoading = signal(false);
  materialRequirements = signal<WorkOrderMaterialRequirement[]>([]);
  materialRequirementsError = signal('');
  materialRequirementsLoading = signal(false);
  materialRequirementsModalOpen: boolean = false;
  materialRequirementsOrder: any = null;

  ngOnInit(): void {
    this.customerService.getAll().subscribe({
      next: customers => this.customers.set(customers ?? []),
      error: () => this.customers.set([]),
    });
  }

  openMaterialRequirements(workOrder: any): void {
    this.materialRequirementsOrder = workOrder;
    this.materialRequirements.set([]);
    this.materialRequirementsError.set('');
    this.materialRequirementsLoading.set(true);
    this.materialRequirementsModalOpen = true;
    this.workOrderService.getMaterialRequirements(workOrder.id).subscribe({
      next: rows => { this.materialRequirements.set(rows ?? []); this.materialRequirementsLoading.set(false); },
      error: error => {
        this.materialRequirementsError.set(error?.error?.message || 'Could not load material requirements.');
        this.materialRequirementsLoading.set(false);
      },
    });
  }

  get canCreate() {
    return this.authService.hasAnyRole(['CEO', 'Engineer']);
  }
  get canComplete() {
    return this.authService.hasAnyRole(['CEO', 'Engineer', 'Accountant']);
  }

  pagination = useDynamicPagination();

  pagedWOs = computed(() => {
    const data = this.workOrderService.WorkOrders();
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  modalOpen = false;
  completeModalOpen = false;
  selectedWorkOrderId: number | null = null;
  editingWorkOrderId: number | null = null;
  previewLines: any[] = [];
  previewError = '';

  prodForm = {
    productionType: 'MTS' as 'MTS' | 'MTO',
    productId: 0,
    qty: null as number | null,
    start: this.workOrderService.today,
    due: '',
    customerId: null as number | null,
    customerContractId: null as number | null,
    notes: '',
  };

  productionLines: Array<{ productId: number; qty: number | null }> = [{ productId: 0, qty: null }];

  createStep: 1 | 2 = 1;

  completeForm = {
    producedQty: null as number | null,
    rawWarehouseId: 0,
    finishedGoodsWarehouseId: 0,
    productionDate: this.workOrderService.today,
  };

  closeModalIfOverlay(event: MouseEvent, id: 'new' | 'complete' | 'materials') {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      if (id === 'new') {
        this.modalOpen = false;
      } else if (id === 'materials') {
        this.materialRequirementsModalOpen = false;
      } else {
        this.completeModalOpen = false;
      }
    }
  }

  openCreateWO() {
    this.editingWorkOrderId = null;
    this.createStep = 1;
    this.prodForm = {
      productionType: 'MTS',
      productId: 0,
      qty: null,
      start: this.workOrderService.today,
      due: '',
      customerId: null,
      customerContractId: null,
      notes: '',
    };
    this.productionLines = [{ productId: 0, qty: null }];
    this.customerContracts.set([]);
    this.modalOpen = true;
  }

  selectProductionType(type: 'MTS' | 'MTO') {
    this.prodForm.productionType = type;
    this.createStep = 2;
  }

  addProductionLine() {
    this.productionLines = [...this.productionLines, { productId: 0, qty: null }];
  }

  removeProductionLine(index: number) {
    if (this.productionLines.length === 1) {
      this.productionLines[0] = { productId: 0, qty: null };
      return;
    }
    this.productionLines = this.productionLines.filter((_, i) => i !== index);
  }

  onCustomerChange(customerId: number | null) {
    this.prodForm.customerContractId = null;
    this.customerContracts.set([]);
    this.customerContractsLoading.set(false);
    if (!customerId) return;

    this.customerContractsLoading.set(true);
    forkJoin({
      current: this.customerContractService.getCurrentByCustomer(customerId).pipe(catchError(() => of(null))),
      parent: this.customerContractService.getParentByCustomer(customerId).pipe(catchError(() => of(null))),
    }).subscribe(({ current, parent }) => {
      const contracts = [current, parent].filter((contract): contract is CustomerContractSummary => !!contract);
      const unique = contracts.filter((contract, index, all) => all.findIndex(item => item.contractId === contract.contractId) === index);
      this.customerContracts.set(unique);
      this.customerContractsLoading.set(false);
    });
  }

  openEditWO(wo: any) {
    this.editingWorkOrderId = wo.id;
    const parseDate = (d: any) => {
      if (!d) return '';
      const str = typeof d === 'string' ? d : new Date(d).toISOString();
      return str.slice(0, 10);
    };
    this.prodForm = {
      productionType: wo.productionType || (wo.customerId || wo.customerContractId ? 'MTO' : 'MTS'),
      productId: wo.finishedProductId || 0,
      qty: wo.plannedQty || null,
      start: parseDate(wo.startDate) || this.workOrderService.today,
      due: parseDate(wo.dueDate),
      customerId: wo.customerId || null,
      customerContractId: wo.customerContractId || null,
      notes: wo.notes || '',
    };
    this.productionLines = [{ productId: wo.finishedProductId || 0, qty: wo.plannedQty || null }];
    this.customerContracts.set([]);
    if (this.prodForm.customerId) this.onCustomerChange(this.prodForm.customerId);
    this.createStep = 2;
    this.modalOpen = true;
  }

  private validateProductionForm(): string | null {
    const f = this.prodForm;
    if (!f.start || !this.productionLines.length || this.productionLines.some(line => !line.productId || !line.qty || line.qty <= 0)) {
      return 'Add at least one product with a valid quantity.';
    }
    if (f.productionType === 'MTO' && !f.customerId) return 'Select a customer for a Make To Order work order.';
    if (f.productionType === 'MTO' && !f.customerContractId) return 'Enter the related Contract / POC reference.';
    if (this.isDueBeforeStart()) return 'Due date cannot be before the start date.';
    return null;
  }

  private getWorkOrderPayload() {
    const f = this.prodForm;
    const payload: any = {
      finishedProductId: Number(this.productionLines[0].productId),
      plannedQty: Number(this.productionLines[0].qty),
      startDate: f.start,
      dueDate: f.due || null,
      notes: f.notes || null,
      productionType: f.productionType,
      productLines: this.productionLines.map(line => ({
        finishedProductId: Number(line.productId),
        plannedQty: Number(line.qty),
      })),
    };
    if (f.productionType === 'MTO') {
      payload.customerId = Number(f.customerId);
      payload.customerContractId = Number(f.customerContractId);
    }
    return payload;
  }

  resetProdForm() {
    this.prodForm = {
      productionType: 'MTS',
      productId: 0,
      qty: null,
      start: this.workOrderService.today,
      due: '',
      customerId: null,
      customerContractId: null,
      notes: '',
    };
    this.productionLines = [{ productId: 0, qty: null }];
    this.customerContracts.set([]);
    this.createStep = 1;
  }

  saveProd() {
    const validationError = this.validateProductionForm();
    if (validationError) return alert(validationError);

    this.workOrderService
      .createWorkOrder(this.getWorkOrderPayload())
      .subscribe({
        next: () => {
          this.workOrderService.fetchWorkOrders();
          this.modalOpen = false;
          this.resetProdForm();
          this.toastService.show('Work order created!');
          this.pagination.resetPage();
        },
        error: (err) => {
          console.error('Failed to create work order:', err);
          alert(err?.error?.message || 'Failed to create work order.');
        },
      });
  }

  updateProd() {
    if (!this.editingWorkOrderId) return;
    const validationError = this.validateProductionForm();
    if (validationError) return alert(validationError);

    this.workOrderService
      .updateWorkOrder(this.editingWorkOrderId, this.getWorkOrderPayload())
      .subscribe({
        next: () => {
          this.workOrderService.fetchWorkOrders();
          this.modalOpen = false;
          this.editingWorkOrderId = null;
          this.resetProdForm();
          this.toastService.show('Work order updated!');
        },
        error: (err) => {
          console.error('Failed to update work order:', err);
          alert(err?.error?.message || 'Failed to update work order.');
        },
      });
  }

  deleteWO(woId: number) {
    if (!confirm('Are you sure you want to delete this work order?')) return;

    this.workOrderService.deleteWorkOrder(woId).subscribe({
      next: () => {
        this.workOrderService.fetchWorkOrders();
        this.toastService.show('Work order deleted!');
      },
      error: (err) => {
        console.error('Failed to delete work order:', err);
        alert(err?.error?.message || 'Failed to delete work order.');
      },
    });
  }

  openCompleteWO(woId: number) {
    const selectedWO = this.workOrderService.WorkOrders().find((w) => w.id === woId);
    const warehouses = this.masterData.WAREHOUSES();
    const rawWH = warehouses.find((w) => w.typeName === 'RawMaterial');
    const finishedWH = warehouses.find((w) => w.typeName === 'FinishedGoods');

    this.selectedWorkOrderId = woId;
    this.completeForm = {
      producedQty: selectedWO
        ? (selectedWO.remainingQty ?? selectedWO.plannedQty - (selectedWO.producedQty || 0))
        : null,
      rawWarehouseId: rawWH?.id ?? 0,
      finishedGoodsWarehouseId: finishedWH?.id ?? 0,
      productionDate: this.workOrderService.today,
    };
    this.previewLines = [];
    this.previewError = '';
    this.completeModalOpen = true;
  }

  previewConsumption() {
    if (!this.selectedWorkOrderId || !this.completeForm.producedQty) {
      return;
    }

    this.previewError = '';
    this.workOrderService
      .previewConsumption(this.selectedWorkOrderId, this.completeForm.producedQty)
      .subscribe({
        next: (data) => {
          this.previewLines = data;
          if (data.some((x) => !x.isSufficient)) {
            this.previewError =
              'Some raw materials are insufficient for the requested production quantity.';
          }
        },
        error: (err) => {
          console.error('Failed to preview consumption:', err);
          this.previewError = err?.error?.message || 'Failed to preview consumption.';
        },
      });
  }

  completeWO() {
    if (!this.selectedWorkOrderId || !this.completeForm.producedQty) {
      return alert('Produced quantity is required.');
    }
    if (!this.completeForm.rawWarehouseId || !this.completeForm.finishedGoodsWarehouseId) {
      return alert('Please select raw material and finished goods warehouses.');
    }

    this.workOrderService
      .previewConsumption(this.selectedWorkOrderId, this.completeForm.producedQty)
      .subscribe({
        next: (preview) => {
          const insufficient = preview.filter((x: any) => !x.isSufficient);
          if (insufficient.length) {
            const message = insufficient
              .map(
                (x: any) =>
                  `${x.rawMaterialName}: required ${x.requiredQty}, available ${x.availableQty}`,
              )
              .join('\n');
            return alert('Insufficient materials:\n' + message);
          }

          this.workOrderService
            .completeWorkOrder(this.selectedWorkOrderId!, {
              producedQty: this.completeForm.producedQty!,
              rawMaterialWarehouseId: this.completeForm.rawWarehouseId,
              finishedGoodsWarehouseId: this.completeForm.finishedGoodsWarehouseId,
              productionDate: this.completeForm.productionDate,
            })
            .subscribe({
              next: (result) => {
                this.workOrderService.refreshAfterCompletion();
                this.completeModalOpen = false;
                const serials = result?.generatedSerialsCount ?? 0;
                const status = result?.status ?? 'Done';
                this.toastService.show(
                  status === 'Partial'
                    ? `Partial completion: ${serials} serials generated.`
                    : `Work order completed! ${serials} serials generated.`,
                );
                this.router.navigate(['/serials'], {
                  queryParams: { type: 'wo', id: String(this.selectedWorkOrderId) },
                });
              },
              error: (err) => {
                console.error('Failed to complete work order:', err);
                alert(err?.error?.message || 'Failed to complete work order.');
              },
            });
        },
        error: (err) => {
          console.error('Failed to preview consumption:', err);
          alert(err?.error?.message || 'Failed to preview consumption.');
        },
      });
  }

  viewWOSerials(woId: number) {
    this.router.navigate(['/serials'], { queryParams: { type: 'wo', id: String(woId) } });
  }

  isDueBeforeStart(): boolean {
    const { start, due } = this.prodForm;
    return !!start && !!due && due < start;
  }

  onStartDateChange() {
    if (this.isDueBeforeStart()) {
      this.prodForm.due = '';
    }
  }

  productionTypeLabel(workOrder: any): string {
    return workOrder.productionTypeName || workOrder.productionType ||
      (workOrder.customerId || workOrder.customerContractId ? 'MTO' : 'MTS');
  }

  approvalStatusLabel(workOrder: any): string {
    if (workOrder.approvalStatusName || workOrder.approvalStatus) {
      return workOrder.approvalStatusName || workOrder.approvalStatus;
    }
    if (this.productionTypeLabel(workOrder) !== 'MTS') return 'Not required';
    const status = String(workOrder.status || '').toLowerCase();
    return status.includes('pending') || status.includes('approval') ? 'Pending CEO Approval' : 'Approved';
  }

  receiptStatusLabel(workOrder: any): string {
    return workOrder.receiptStatusName || workOrder.receiptStatus ||
      (workOrder.status === 'Done' || workOrder.status === 'Partial' ? 'Pending' : '—');
  }

  statusClass(status: string | null | undefined): string {
    const value = (status || '').toLowerCase();
    if (value.includes('approved') || value.includes('received') || value === 'done') return 'badge-done';
    if (value.includes('pending')) return 'badge-pending';
    if (value.includes('not required') || value === '—') return 'badge-neutral';
    if (value.includes('reject') || value.includes('cancel')) return 'badge-cancelled';
    return 'badge-inprod';
  }
}
