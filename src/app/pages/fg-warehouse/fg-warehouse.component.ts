import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MasterDataService } from '../../services/master-data.service';
import { WorkOrderService } from '../../services/work-order.service';
import { SerialNumberService } from '../../services/serial-number.service';
import { InventoryService } from '../../services/inventory.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { SearchableSelectComponent, SelectOption } from '../../components/searchable-select/searchable-select.component';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { SerialsComponent } from '../serials/serials.component';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../models/customer.models';
import { CustomerContractService } from '../../services/customer-contract.service';
import { CustomerContractSummary } from '../../models/customer-contract.dto';
import { DeliveryRequestService } from '../../services/delivery-request.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

type FinishedProductForm = {
  name: string;
  modelType: string;
  serialPrefix: string;
  serialStartNumber: string;
};

const emptyProductForm = (): FinishedProductForm => ({
  name: '',
  modelType: '',
  serialPrefix: '',
  serialStartNumber: '0',
});

const DEMO_FINISHED_GOODS = [
  { id: 101, code: 'FP-TEST-001', name: 'Control Panel 100', modelType: 'CP100', currentStock: 8, reservedStock: 2, totalProduced: 20, lastProductionDate: '2026-10-16' },
  { id: 102, code: 'FP-TEST-002', name: 'Power Quality Beacon', modelType: 'PQB-40', currentStock: 5, reservedStock: 0, totalProduced: 12, lastProductionDate: '2026-10-15' },
  { id: 103, code: 'FP-TEST-003', name: 'Industrial Gateway', modelType: 'IG-200', currentStock: 0, reservedStock: 3, totalProduced: 9, lastProductionDate: '2026-10-12' },
];

const DEMO_SERIALS = [
  { id: 5001, serial: 'MTS-CP100-000001', finishedProductId: 101, finishedProductName: 'Control Panel 100', status: 'InStock', productionDate: '2026-10-16T10:00:00', workOrderNumber: 'WO-0001', originTypeName: 'MakeToStock', customerName: null },
  { id: 5002, serial: 'MTS-CP100-000002', finishedProductId: 101, finishedProductName: 'Control Panel 100', status: 'InStock', productionDate: '2026-10-16T10:00:00', workOrderNumber: 'WO-0001', originTypeName: 'MakeToStock', customerName: null },
  { id: 5003, serial: 'MTS-CP100-000003', finishedProductId: 101, finishedProductName: 'Control Panel 100', status: 'InStock', productionDate: '2026-10-16T10:00:00', workOrderNumber: 'WO-0001', originTypeName: 'MakeToStock', customerName: null },
  { id: 5004, serial: 'MTS-CP100-000004', finishedProductId: 101, finishedProductName: 'Control Panel 100', status: 'InStock', productionDate: '2026-10-16T10:00:00', workOrderNumber: 'WO-0001', originTypeName: 'MakeToStock', customerName: null },
  { id: 5005, serial: 'MTS-CP100-000005', finishedProductId: 101, finishedProductName: 'Control Panel 100', status: 'Reserved', productionDate: '2026-10-16T10:00:00', workOrderNumber: 'WO-0001', originTypeName: 'MakeToStock', customerName: 'Cairo Smart Facilities' },
  { id: 5006, serial: 'MTS-CP100-000006', finishedProductId: 101, finishedProductName: 'Control Panel 100', status: 'Reserved', productionDate: '2026-10-16T10:00:00', workOrderNumber: 'WO-0001', originTypeName: 'MakeToStock', customerName: 'Cairo Smart Facilities' },
  { id: 5010, serial: 'MTS-PQB-000001', finishedProductId: 102, finishedProductName: 'Power Quality Beacon', status: 'InStock', productionDate: '2026-10-15T09:30:00', workOrderNumber: 'WO-0002', originTypeName: 'MakeToStock', customerName: null },
];

const DEMO_CUSTOMERS: Customer[] = [
  { id: 901, companyName: 'Cairo Smart Facilities', location: 'Cairo', region: 'Cairo', country: 'Egypt', website: null, phoneNumber: '', email: '', industryTypeId: 0, industryTypeName: 'Industrial', status: 8, registrationOrTaxId: null, notes: null, createdByUserId: '', createdByName: null, assignedToId: null, assignedToName: null, createdAt: '' },
  { id: 902, companyName: 'Delta Technology', location: 'Giza', region: 'Giza', country: 'Egypt', website: null, phoneNumber: '', email: '', industryTypeId: 0, industryTypeName: 'Technology', status: 8, registrationOrTaxId: null, notes: null, createdByUserId: '', createdByName: null, assignedToId: null, assignedToName: null, createdAt: '' },
];

const DEMO_CONTRACTS: CustomerContractSummary[] = [
  { contractId: 121, customerId: 901, customerName: 'Cairo Smart Facilities', startedFromStatus: 5, startedFromStatusName: 'Opportunity', contractTitle: 'Cairo Facilities Upgrade', contractStartDate: '2026-10-01', contractEndDate: '2027-03-31', exclusions: '', terms: '', comments: '', status: 4, statusName: 'Deal Done', billOfQuantity: [] },
  { contractId: 113, customerId: 902, customerName: 'Delta Technology', startedFromStatus: 5, startedFromStatusName: 'Opportunity', contractTitle: 'Delta IoT Monitoring', contractStartDate: '2026-10-01', contractEndDate: '2027-04-30', exclusions: '', terms: '', comments: '', status: 4, statusName: 'Deal Done', billOfQuantity: [] },
];

@Component({
  selector: 'app-fg-warehouse',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, SearchableSelectComponent, SerialsComponent],
  templateUrl: './fg-warehouse.component.html',
  styleUrl: './fg-warehouse.component.css'
})
export class FgWarehouseComponent implements OnInit {
  masterData = inject(MasterDataService);
  workOrderService = inject(WorkOrderService);
  serialService = inject(SerialNumberService);
  inventory = inject(InventoryService);
  authService = inject(AuthService);
  toastService = inject(ToastService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  customerService = inject(CustomerService);
  customerContractService = inject(CustomerContractService);
  deliveryRequestService = inject(DeliveryRequestService);

  pagination = useDynamicPagination();
  stockSearch = signal('');
  activeTab = signal<'finished' | 'serials'>('finished');

  modalOpen = false;
  productForm: FinishedProductForm = emptyProductForm();
  productSubmitted = false;
  productSaving = false;

  reserveModalOpen = false;
  reserveTarget: any = null;
  reserveSubmitting = false;
  customers = signal<Customer[]>([]);
  customerContracts = signal<CustomerContractSummary[]>([]);
  customerContractsLoading = signal(false);
  selectedSerialIds = signal<number[]>([]);
  reserveForm = {
    customerId: null as number | null,
    customerContractId: null as number | null,
    quantity: 1,
  };

  productNameOptions = computed((): SelectOption[] =>
    this.masterData.FINISHED_PRODUCT_NAMES().map((item) => ({ value: item.name, label: item.name })),
  );

  get canCreateProduct() {
    return this.authService.hasAnyRole(['CEO', 'Engineer', 'Admin', 'Technician']);
  }

  finishedGoodsSource = computed(() => {
    const live = this.inventory.FinishedGoods();
    return live.length || environment.production ? live : DEMO_FINISHED_GOODS;
  });

  productTypes = computed(() => this.finishedGoodsSource().length);
  totalUnits = computed(() => this.finishedGoodsSource().reduce((a: any, p: any) => a + (p.availableStock ?? p.currentStock ?? 0), 0));
  completedWOs = computed(() =>
    this.workOrderService.WorkOrders().filter(w => w.status === 'Done').length || (environment.production ? 0 : 2)
  );
  totalSerials = computed(() => {
    const live = this.serialService.Serials();
    return live.length || environment.production ? live.length : DEMO_SERIALS.length;
  });

  fgStockValues = computed(() => {
    const term = this.stockSearch().toLowerCase().trim();
    const filtered = this.finishedGoodsSource()
      .filter((p: any) => !term || [p.code, p.name, p.modelType].join(' ').toLowerCase().includes(term));
    return [...filtered]
      .sort((a: any, b: any) => (b.currentStock ?? 0) - (a.currentStock ?? 0))
      .map((p: any) => {
        const available = p.availableStock ?? p.currentStock ?? 0;
        const reserved = p.reservedStock ?? p.reservedQuantity ?? 0;
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          modelType: p.modelType,
          qty: available,
          reserved,
          totalStock: p.totalStock ?? available + reserved,
          total: p.totalProduced || 0,
          lastDate: p.lastProductionDate || '-',
        };
      });
  });

  pagedFgStockValues = computed(() => {
    const data = this.fgStockValues();
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  ngOnInit() {
    this.customerService.getAll().subscribe({
      next: (customers) => this.customers.set(customers?.length ? customers : (environment.production ? [] : DEMO_CUSTOMERS)),
      error: () => this.customers.set(environment.production ? [] : DEMO_CUSTOMERS),
    });
    if (!environment.production) {
      setTimeout(() => {
        if (!this.serialService.Serials().length) this.serialService.Serials.set(DEMO_SERIALS);
      }, 700);
    }
    this.route.queryParams.subscribe((params) => {
      this.activeTab.set(params['tab'] === 'serials' ? 'serials' : 'finished');
    });
  }

  availableSerialsForTarget() {
    const productId = this.reserveTarget?.id;
    if (!productId) return [];
    const source = this.serialService.Serials().length || environment.production ? this.serialService.Serials() : DEMO_SERIALS;
    return source.filter((serial: any) =>
      Number(serial.finishedProductId ?? serial.productId) === Number(productId) &&
      (serial.status === 'InStock' || serial.status === 'In Stock'),
    );
  }

  openReserve(target: any) {
    this.reserveTarget = target;
    this.reserveForm = { customerId: null, customerContractId: null, quantity: 1 };
    this.customerContracts.set([]);
    this.selectedSerialIds.set([]);
    this.reserveModalOpen = true;
    this.serialService.fetchAll();
  }

  closeReserve() {
    if (this.reserveSubmitting) return;
    this.reserveModalOpen = false;
    this.reserveTarget = null;
    this.selectedSerialIds.set([]);
  }

  closeReserveIfOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) this.closeReserve();
  }

  onReserveCustomerChange(customerId: number | null) {
    this.reserveForm.customerId = customerId;
    this.reserveForm.customerContractId = null;
    this.customerContracts.set([]);
    if (!customerId) return;

    this.customerContractsLoading.set(true);
    forkJoin({
      current: this.customerContractService.getCurrentByCustomer(customerId).pipe(catchError(() => of(null))),
      parent: this.customerContractService.getParentByCustomer(customerId).pipe(catchError(() => of(null))),
    }).subscribe(({ current, parent }) => {
      const contracts = [current, parent].filter((contract): contract is CustomerContractSummary => !!contract);
      const unique = contracts.filter((contract, index, all) =>
        all.findIndex((item) => item.contractId === contract.contractId) === index,
      );
      this.customerContracts.set(unique.length ? unique : (environment.production ? [] : DEMO_CONTRACTS.filter((contract) => contract.customerId === customerId)));
      this.customerContractsLoading.set(false);
    });
  }

  onReserveQuantityChange(quantity: number) {
    const max = Math.max(1, Math.min(Number(quantity) || 1, this.reserveTarget?.qty || 1));
    this.reserveForm.quantity = max;
    const available = this.availableSerialsForTarget();
    this.selectedSerialIds.set(available.slice(0, max).map((serial: any) => serial.id));
  }

  toggleReserveSerial(serialId: number) {
    const selected = this.selectedSerialIds();
    this.selectedSerialIds.set(
      selected.includes(serialId) ? selected.filter((id) => id !== serialId) : [...selected, serialId],
    );
    this.reserveForm.quantity = this.selectedSerialIds().length || 1;
  }

  submitReservation() {
    if (!this.reserveTarget || !this.reserveForm.customerContractId) {
      this.toastService.show('Select a customer and Contract / POC first.');
      return;
    }
    const serialIds = this.selectedSerialIds();
    if (!serialIds.length) {
      this.toastService.show('Select at least one available serial to reserve.');
      return;
    }

    this.reserveSubmitting = true;
    this.deliveryRequestService.create({
      customerContractId: Number(this.reserveForm.customerContractId),
      serialNumberIds: serialIds,
    }).subscribe({
      next: () => {
        this.inventory.fetchFinishedGoods();
        this.serialService.fetchAll();
        this.reserveSubmitting = false;
        this.closeReserve();
        this.toastService.show('MTS stock reserved for the MTO request.');
      },
      error: (error) => {
        this.reserveSubmitting = false;
        this.toastService.show(error?.error?.message || 'Could not reserve the selected stock.');
      },
    });
  }

  selectTab(tab: 'finished' | 'serials') {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: tab === 'serials' ? { tab: 'serials' } : {},
      queryParamsHandling: '',
    });
  }

  openAddProduct() {
    this.productForm = emptyProductForm();
    this.productSubmitted = false;
    this.modalOpen = true;
  }

  closeAddProduct() {
    if (!this.productSaving) this.modalOpen = false;
  }

  closeModalIfOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) this.closeAddProduct();
  }

  onModelInput(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^\p{L}\p{N} ]/gu, '').replace(/^ +/, '').replace(/ {2,}/g, ' ');
    this.productForm.modelType = input.value;
  }

  onPrefixInput(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 10);
    this.productForm.serialPrefix = input.value;
  }

  onNumberInput(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 9);
    this.productForm.serialStartNumber = input.value;
  }

  serialPreview() {
    const prefix = this.productForm.serialPrefix || 'PREFIX';
    const number = Number(this.productForm.serialStartNumber || 0) + 1;
    return `${prefix}-${String(number).padStart(6, '0')}`;
  }

  saveProduct() {
    this.productSubmitted = true;
    const form = this.productForm;
    if (!form.name.trim() || !/^[A-Z]{1,10}$/.test(form.serialPrefix.trim()) || !/^\d{1,9}$/.test(form.serialStartNumber.trim())) {
      this.toastService.show('Please complete the required product fields.');
      return;
    }

    this.productSaving = true;
    this.masterData.addFinishedProduct({
      name: form.name.trim(),
      modelType: form.modelType.trim() || undefined,
      serialPrefix: form.serialPrefix.trim(),
      serialStartNumber: Number(form.serialStartNumber),
    });
    this.productSaving = false;
    this.modalOpen = false;
    this.productForm = emptyProductForm();
    this.toastService.show('Finished product added successfully!');
    this.pagination.resetPage();
  }

}
