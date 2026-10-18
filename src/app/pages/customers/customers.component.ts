import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { CustomerService } from '../../services/customer.service';
import { IndustryTypeService } from '../../services/industry-type.service';
import { ToastService } from '../../services/toast.service';
import { SalesActivityListItem } from '../../models/sales-activity.models';
import {
  EngineerDeliveryRequestDetails,
  EngineerDeliveryRequestListItem,
} from '../../models/delivery-request.dto';
import { SalesActivityService } from '../../services/sales-activity.service';
import { environment } from '../../../environments/environment';
import type { CustomerEngineer } from '../../models/customer-engineer.dto';
import {
  Customer,
  CustomerContact,
  CustomerContactPayload,
  CustomerContactUpdatePayload,
  CustomerPayload,
  CustomerStatus,
  CustomerUpdatePayload,
  ContactInfluence,
  DealRole,
  IndustryType,
  SalesActivityType,
  SalesUser,
} from '../../models/customer.models';
import { CustomerContactService } from '../../services/customer-contact';
import { DeliveryRequestService } from '../../services/delivery-request.service';
import { CustomerStageDetails } from '../../models/customer-stage-details.dto';
import { CustomerStageChangeRequestService } from '../../services/customer-stage-change-request';

import { CustomerPocPilotService } from '../../services/customer-poc-pilot.service';
import { CustomerPocPilotPayload, PocPilotType } from '../../models/customer-poc-pilot.dto';
import { CustomerTimelineService } from '../../services/customer-timeline.service';
import {
  CustomerTimelineEvent,
  CustomerTimelineEventType,
} from '../../models/customer-timeline.dto';

import { forkJoin, Observable } from 'rxjs';
import {
  StageChangeRequest,
  StageChangeRequestPayload,
  StageChangeApprovalPayload,
  OpportunityCategory,
  OpportunityPriority,
} from '../../models/customer-stage-change-request.dto';
import { CustomerContractService } from '../../services/customer-contract.service';
import {
  ContractWorkflowStatus,
  CustomerContractSummary,
  SubContractPayload,
  UpdateBillOfQuantityPayload,
} from '../../models/customer-contract.dto';
import { CustomerActivityService } from '../../services/customer-activity.service';
import {
  CustomerActivity,
  CustomerActivityPayload,
  CustomerActivityUpdatePayload,
} from '../../models/customer-activity.dto';
import { FinishedProductBalanceService } from '../../services/finished-product-balance.service';
import { FinishedProductBalance } from '../../models/finished-product-balance.dto';
import { MasterDataService } from '../../services/master-data.service';
import { DeliveryRequestStatusName, SerialDeliveryStatus } from '../../models/delivery-request.dto';
import { ConfirmDialogComponent } from '../../shared/ui';
import { CustomerRailComponent } from './workspace/customer-rail/customer-rail.component';
import { WorkspaceHeaderComponent } from './workspace/workspace-header/workspace-header.component';
import { OverviewTabComponent } from './workspace/overview-tab/overview-tab.component';
import { ContactsTabComponent } from './workspace/contacts-tab/contacts-tab.component';
import { TimelineTabComponent } from './workspace/timeline-tab/timeline-tab.component';
import { SerialsTabComponent } from './workspace/serials-tab/serials-tab.component';
import { LOCATION_DATA } from './workspace/location-data';

import type {
  CustomerActivityForm, CustomerContactForm, CustomerForm, DeleteTarget, DirectConversionType,
  ReservedSerialRow, StageUpgradeForm, SubContractForm,
} from './workspace/customer-forms.types';
import {
  createCustomerActivityForm, createCustomerContactForm, createCustomerForm,
  createStageUpgradeForm, createSubContractForm,
} from './workspace/customer-form.factory';
import {
  isValidCustomerEmail,
  isValidCustomerName,
  isValidCustomerPhone,
  isValidCustomerUrl,
  isValidIndustryName as validateIndustryName,
  restrictToDigits as sanitizeDigitsInput,
  restrictToLetters as sanitizeLettersInput,
  sanitizeIndustryName as sanitizeIndustryValue,
} from './workspace/customer-validation';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ConfirmDialogComponent,
    CustomerRailComponent,
    WorkspaceHeaderComponent,
    OverviewTabComponent,
    ContactsTabComponent,
    TimelineTabComponent,
    SerialsTabComponent,
  ],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.css',
})
export class CustomersComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly toast = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly industryTypeService = inject(IndustryTypeService);
  private readonly salesActivityService = inject(SalesActivityService);
  private readonly customerContactService = inject(CustomerContactService);
  private readonly stageChangeRequestService = inject(CustomerStageChangeRequestService);
  readonly customers = signal<Customer[]>([]);
  readonly activeCustomer = signal<Customer | null>(null);
  readonly industryTypes = signal<IndustryType[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly search = signal('');
  readonly customerActivities = signal<SalesActivityListItem[]>([]);
  readonly activitiesLoading = signal(false);
  readonly customerContacts = signal<CustomerContact[]>([]);
  readonly contactsLoading = signal(false);
  readonly savingContact = signal(false);

  readonly workspaceContacts = signal<CustomerContact[]>([]);
  readonly workspaceContactsLoading = signal(false);
  private readonly customerActivityService = inject(CustomerActivityService);
  readonly customerActivitiesList = signal<CustomerActivity[]>([]);
  activityEditingId: number | null = null;
  // Stage progression / approval workflow
  readonly stageDetails = signal<CustomerStageDetails | null>(null);
  readonly stageDetailsLoading = signal(false);
  readonly pendingRequests = signal<StageChangeRequest[]>([]);
  readonly pendingRequestsLoading = signal(false);
  readonly pendingRequest = computed(() => this.pendingRequests()[0] ?? null);
  readonly hasPendingRequest = computed(() => this.pendingRequests().length > 0);
  readonly allowedNextStatuses = computed(() => {
    const customer = this.activeCustomer();
    return customer ? this.getAllowedNextStatuses(customer.status) : [];
  });
  readonly nextStageLabel = computed(() => {
    const next = this.allowedNextStatuses()[0];
    return next ? this.statusLabel(next) : null;
  });
  readonly upgradeSaving = signal(false);
  readonly savingStageAction = signal(false);
  readonly pocApprovalSaving = signal(false);
  pocApprovalComment = '';
  upgradeFormOpen = false;
  upgradeForm: StageUpgradeForm = createStageUpgradeForm(null);
  rejectRequestOpen = false;
  rejectReason = '';
  private readonly customerPocPilotService = inject(CustomerPocPilotService);
  readonly upgradeFormContacts = signal<CustomerContact[]>([]);
  private readonly customerTimelineService = inject(CustomerTimelineService);
  readonly CustomerTimelineEventType = CustomerTimelineEventType;
  readonly customerTimeline = signal<CustomerTimelineEvent[]>([]);
  readonly timelineLoading = signal(false);

  private readonly customerContractService = inject(CustomerContractService);
  readonly ContractWorkflowStatus = ContractWorkflowStatus;
  readonly currentContract = signal<CustomerContractSummary | null>(null);
  readonly contractLoading = signal(false);
  readonly contractActionSaving = signal(false);
  readonly subContracts = signal<CustomerContractSummary[]>([]);
  readonly subContractsLoading = signal(false);
  readonly subContractSaving = signal(false);
  subContractFormOpen = false;
  subContractForm: SubContractForm = createSubContractForm();

  readonly subContractDetailsOpen = signal(false);
  readonly subContractDetails = signal<CustomerContractSummary | null>(null);
  readonly subContractDetailsLoading = signal(false);
  readonly parentContractId = signal<number | null>(null);
  readonly contractSteps: { name: string; label: string }[] = [
    { name: 'PendingCcoApproval', label: 'CCO approval' },
    { name: 'PendingLegalReviewApproval', label: 'Legal review' },
    { name: 'PendingCeoApproval', label: 'CEO approval' },
    { name: 'DealDone', label: 'Deal done' },
  ];
  readonly deliverySubContracts = computed(() =>
    this.subContracts().filter((s) => s.statusName === 'DealDone'),
  );
  readonly expandedSubContractId = signal<number | null>(null);
  readonly subSerialsLoadingId = signal<number | null>(null);
  readonly creatingForSubId = signal<number | null>(null);
  readonly subContractSerials = signal<Record<number, ReservedSerialRow[]>>({});
  readonly selectedSerialsBySub = signal<Record<number, number[]>>({});

  toggleSubContractGroup(sub: CustomerContractSummary): void {
    if (this.expandedSubContractId() === sub.contractId) {
      this.expandedSubContractId.set(null);
      return;
    }
    this.expandedSubContractId.set(sub.contractId);
    this.loadSubContractSerials(sub.contractId);
  }

  loadSubContractSerials(contractId: number): void {
    this.subSerialsLoadingId.set(contractId);
    this.deliveryRequestService.getReservedSerials(contractId).subscribe({
      next: (serials) => {
        const products = this.finishedProducts();
        const rows: ReservedSerialRow[] = (Array.isArray(serials) ? serials : []).map((s) => ({
          id: s.id,
          serialNumber: s.serial,
          productName:
            products.find((p) => p.id === s.finishedProductId)?.name ??
            `Product #${s.finishedProductId}`,
        }));
        this.subContractSerials.update((m) => ({ ...m, [contractId]: rows }));
        this.subSerialsLoadingId.set(null);
      },
      error: (error) => {
        console.error('Failed to load sub-contract serials:', error);
        this.subContractSerials.update((m) => ({ ...m, [contractId]: [] }));
        this.subSerialsLoadingId.set(null);
        this.toast.show('Failed to load reserved serials.');
      },
    });
  }

  selectedCountFor(contractId: number): number {
    return this.selectedSerialsBySub()[contractId]?.length ?? 0;
  }

  isSubSerialSelected(contractId: number, serialId: number): boolean {
    return (this.selectedSerialsBySub()[contractId] ?? []).includes(serialId);
  }

  toggleSubSerial(contractId: number, serialId: number): void {
    const current = this.selectedSerialsBySub()[contractId] ?? [];
    const next = current.includes(serialId)
      ? current.filter((id) => id !== serialId)
      : [...current, serialId];
    this.selectedSerialsBySub.update((m) => ({ ...m, [contractId]: next }));
  }

  toggleAllSubSerials(contractId: number): void {
    const all = (this.subContractSerials()[contractId] ?? []).map((s) => s.id);
    const allSelected = this.selectedCountFor(contractId) === all.length;
    this.selectedSerialsBySub.update((m) => ({ ...m, [contractId]: allSelected ? [] : all }));
  }

  submitSubDeliveryRequest(sub: CustomerContractSummary): void {
    const selected = this.selectedSerialsBySub()[sub.contractId] ?? [];
    if (!selected.length) {
      this.toast.show('Select at least one serial.');
      return;
    }

    this.creatingForSubId.set(sub.contractId);
    this.deliveryRequestService
      .create({ customerContractId: sub.contractId, serialNumberIds: selected })
      .subscribe({
        next: (created) => {
          this.creatingForSubId.set(null);
          this.selectedSerialsBySub.update((m) => ({ ...m, [sub.contractId]: [] }));
          this.toast.show(`Delivery request ${created?.requestNumber ?? ''} created successfully.`);
          this.loadSubContractSerials(sub.contractId);
          this.deliverySubTab.set('my-requests');
          this.loadEngineerRequests();
          if (created?.id) this.openEngineerRequestDetails(created.id);
        },
        error: (error) => {
          console.error('Failed to create delivery request:', error);
          this.creatingForSubId.set(null);
          this.toast.show(this.errorMessage(error, 'Failed to create delivery request.'));
        },
      });
  }
  readonly subContractActionId = signal<number | null>(null);

  approveSubContractStep(sub: CustomerContractSummary, isApproved: boolean, comment = ''): void {
    const parentId = this.parentContractId();

    this.subContractActionId.set(sub.contractId);
    this.customerContractService.approve(sub.contractId, { isApproved, comment }).subscribe({
      next: () => {
        this.subContractActionId.set(null);
        this.toast.show(isApproved ? 'Sub-contract step approved.' : 'Sub-contract rejected.');

        if (parentId) this.loadSubContracts(parentId);

        if (this.subContractDetails()?.contractId === sub.contractId) {
          this.refreshSubContractDetails(sub.contractId);
        }
      },
      error: (error) => {
        console.error('Failed to update sub-contract step:', error);
        this.subContractActionId.set(null);
        this.toast.show(this.errorMessage(error, 'Failed to update sub-contract step.'));
      },
    });
  }

  private refreshSubContractDetails(contractId: number): void {
    this.customerContractService.getById(contractId).subscribe({
      next: (details) => this.subContractDetails.set(details),
      error: (error) => console.error('Failed to refresh sub-contract details:', error),
    });
  }

  get isEngineer(): boolean {
    return this.authService.hasAnyRole(['Engineer']);
  }
  readonly LOCATION_DATA = LOCATION_DATA;
  readonly regions = Object.keys(LOCATION_DATA);

  get availableCountries(): string[] {
    return Object.keys(LOCATION_DATA[this.form.region] ?? {});
  }

  get availableCities(): string[] {
    return LOCATION_DATA[this.form.region]?.[this.form.country] ?? [];
  }
  // readonly countryRegions = this.COUNTRY_REGIONS;
  // readonly countries = Object.keys(this.COUNTRY_REGIONS);

  onRegionChange(): void {
    if (!this.availableCountries.includes(this.form.country)) {
      this.form.country = '';
    }
    this.form.city = '';
  }

  onCountryChange(): void {
    if (!this.availableCities.includes(this.form.city)) {
      this.form.city = '';
    }
  }
  // get availableRegions(): string[] {
  //   return this.countryRegions[this.form.country] ?? [];
  // }

  isValidUrl(value: string): boolean {
    return isValidCustomerUrl(value);
  }

  readonly boqEditing = signal(false);
  readonly boqSaving = signal(false);
  boqDraft: { id: number; scope: string; item: string; quantity: number | null }[] = [];

  startEditBoq(contract: CustomerContractSummary): void {
    this.boqDraft = (contract.billOfQuantity ?? []).map((r) => ({
      id: r.id,
      scope: r.scope,
      item: r.item,
      quantity: r.quantity,
    }));
    if (!this.boqDraft.length) this.addBoqRow();
    this.boqEditing.set(true);
  }

  cancelEditBoq(): void {
    if (this.boqSaving()) return;
    this.boqEditing.set(false);
    this.boqDraft = [];
  }

  addBoqRow(): void {
    this.boqDraft.push({ id: 0, scope: '', item: '', quantity: null });
  }

  removeBoqRow(index: number): void {
    this.boqDraft.splice(index, 1);
  }

  productNameExists(name: string): boolean {
    return this.finishedProducts().some((p) => p.name === name);
  }

  saveBoq(): void {
    const contract = this.currentContract();
    const customerId = this.activeCustomer()?.id;
    if (!contract || !customerId) return;

    if (!this.boqDraft.length) {
      this.toast.show('Add at least one item.');
      return;
    }
    if (this.boqDraft.some((r) => !r.item.trim() || !(Number(r.quantity) > 0))) {
      this.toast.show('Each row needs an item and a quantity greater than 0.');
      return;
    }

    const payload: UpdateBillOfQuantityPayload = {
      items: this.boqDraft.map((r) => ({
        id: r.id,
        scope: r.scope.trim(),
        item: r.item.trim(),
        quantity: Number(r.quantity),
      })),
    };

    this.boqSaving.set(true);
    this.customerContractService.updateBillOfQuantity(contract.contractId, payload).subscribe({
      next: () => {
        this.boqSaving.set(false);
        this.boqEditing.set(false);
        this.boqDraft = [];
        this.toast.show('Bill of quantity updated.');
        this.loadContract(customerId);
      },
      error: (error) => {
        console.error('Failed to update bill of quantity:', error);
        this.boqSaving.set(false);
        this.toast.show(this.errorMessage(error, 'Failed to update bill of quantity.'));
      },
    });
  }
  contractStepIndex(statusName: string): number {
    return this.contractSteps.findIndex((step) => step.name === statusName);
  }

  private readonly contractStepRoles: Record<string, string> = {
    PendingCcoApproval: 'CCO',
    PendingLegalReviewApproval: 'Legal Reviewer',
    PendingCeoApproval: 'CEO',
  };

  contractStepRole(statusName: string): string | null {
    return this.contractStepRoles[statusName] ?? null;
  }

  canApproveContractStep(statusName: string): boolean {
    if (statusName === 'DealDone' || statusName === 'Rejected') return false;
    const role = this.contractStepRole(statusName);
    return !!role && this.authService.hasAnyRole([role]);
  }

  readonly pocApprovalSteps = [
    { name: 'PendingCcoApproval', label: 'CCO' },
    { name: 'PendingLegalReviewApproval', label: 'Legal Reviewer' },
    { name: 'PendingCeoApproval', label: 'CEO' },
    { name: 'Done', label: 'Done' },
  ];
  private readonly pocApprovalStepRoles: Record<string, string> = {
    PendingCcoApproval: 'CCO',
    PendingLegalReviewApproval: 'Legal Reviewer',
    PendingCeoApproval: 'CEO',
  };

  pocApprovalStepRole(statusName: string): string | null {
    const normalized = statusName.toLowerCase();
    if (['done', 'dealdone', 'approved', 'rejected'].includes(normalized)) {
      return null;
    }
    if (normalized === 'pendingccoapproval') return 'CCO';
    if (normalized === 'pendinglegalreviewapproval' || normalized === 'pendinglegalapproval') return 'Legal Reviewer';
    if (normalized === 'pendingceoapproval') return 'CEO';
    return this.pocApprovalStepRoles[statusName] ?? null;
  }

  canApprovePocStep(statusName: string): boolean {
    const role = this.pocApprovalStepRole(statusName);
    return !!role && this.authService.hasAnyRole([role]);
  }

  pocApprovalStepIndex(statusName: string): number {
    const normalized = statusName.toLowerCase();
    if (['done', 'dealdone', 'approved'].includes(normalized)) return 3;
    if (normalized === 'pendinglegalapproval') return 1;
    const index = this.pocApprovalSteps.findIndex((step) => step.name.toLowerCase() === normalized);
    return index < 0 ? 0 : index;
  }

  loadContract(customerId: number): void {
    this.contractLoading.set(true);
    this.currentContract.set(null);
    this.subContracts.set([]);
    this.parentContractId.set(null);

    this.customerContractService.getParentByCustomer(customerId).subscribe({
      next: (parent) => {
        this.parentContractId.set(parent.contractId);
        this.loadSubContracts(parent.contractId);

        this.customerContractService.getById(parent.contractId).subscribe({
          next: (fullContract) => {
            this.currentContract.set(fullContract);
            this.contractLoading.set(false);
            if (this.workspaceTab === 'delivery') this.loadReservedSerials(fullContract.contractId);
          },
          error: () => {
            this.currentContract.set(parent);
            this.contractLoading.set(false);
            if (this.workspaceTab === 'delivery') this.loadReservedSerials(parent.contractId);
          },
        });
      },
      error: () => {
        this.currentContract.set(null);
        this.parentContractId.set(null);
        this.subContracts.set([]);
        this.contractLoading.set(false);
      },
    });
  }

  openWorkspaceContract(customer: Customer): void {
    this.workspaceTab = 'contract';
  }

  approveContractStep(isApproved: boolean, comment: string): void {
    const contract = this.currentContract();
    const customerId = this.activeCustomer()?.id;
    if (!contract || !customerId) return;

    this.contractActionSaving.set(true);
    this.customerContractService.approve(contract.contractId, { isApproved, comment }).subscribe({
      next: () => {
        this.contractActionSaving.set(false);
        this.toast.show(isApproved ? 'Contract step approved.' : 'Contract rejected.');
        this.loadContract(customerId);
      },
      error: (error) => {
        console.error('Failed to update contract step:', error);
        this.contractActionSaving.set(false);
        this.toast.show(error.error?.message || 'Failed to update contract step.');
      },
    });
  }
  loadSubContracts(parentContractId: number): void {
    this.subContractsLoading.set(true);
    this.customerContractService.getSubContracts(parentContractId).subscribe({
      next: (contracts) => {
        this.subContracts.set(Array.isArray(contracts) ? contracts : []);
        this.subContractsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load sub-contracts:', error);
        this.subContractsLoading.set(false);
      },
    });
  }

  openAddSubContract(): void {
    this.subContractForm = createSubContractForm();
    this.subContractFormOpen = true;
  }
  closeSubContractForm(): void {
    if (this.subContractSaving()) return;
    this.subContractFormOpen = false;
  }

  addSubContractResource(): void {
    this.subContractForm.resources.push({ scope: '', item: '', qty: null });
  }

  removeSubContractResource(index: number): void {
    this.subContractForm.resources.splice(index, 1);
  }

  submitSubContract(): void {
    const parentId = this.parentContractId();
    if (!parentId) {
      this.toast.show('No parent contract found for this customer.');
      return;
    }

    if (
      !this.subContractForm.contractTitle.trim() ||
      !this.subContractForm.contractStartDate ||
      !this.subContractForm.contractEndDate ||
      !this.subContractForm.terms.trim()
    ) {
      this.toast.show('Please complete all sub-contract fields.');
      return;
    }

    const payload: SubContractPayload = {
      contractTitle: this.subContractForm.contractTitle.trim(),
      contractStartDate: new Date(this.subContractForm.contractStartDate).toISOString(),
      contractEndDate: new Date(this.subContractForm.contractEndDate).toISOString(),
      exclusions: this.subContractForm.exclusions.trim(),
      terms: this.subContractForm.terms.trim(),
      comments: this.subContractForm.comments.trim(),
      boqItems: this.subContractForm.resources
        .filter((resource) => resource.item.trim())
        .map((resource) => ({
          scope: resource.scope.trim(),
          item: resource.item.trim(),
          quantity: Number(resource.qty) || 0,
          finishedProductId:
            this.finishedProducts().find((p) => p.name === resource.item.trim())?.id || 0,
        })),
    };

    this.subContractSaving.set(true);
    this.customerContractService.createSubContract(parentId, payload).subscribe({
      next: () => {
        this.subContractSaving.set(false);
        this.subContractFormOpen = false;
        this.toast.show('Sub-contract created successfully.');
        this.loadSubContracts(parentId);
      },
      error: (error) => {
        console.error('Failed to create sub-contract:', error);
        this.subContractSaving.set(false);
        this.toast.show(error.error?.message || 'Failed to create sub-contract.');
      },
    });
  }

  openSubContractDetails(contract: CustomerContractSummary): void {
    this.subContractDetailsOpen.set(true);
    this.subContractDetailsLoading.set(true);
    this.subContractDetails.set(null);
    this.customerContractService.getById(contract.contractId).subscribe({
      next: (details) => {
        this.subContractDetails.set(details);
        this.subContractDetailsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load sub-contract details:', error);
        this.subContractDetailsLoading.set(false);
        this.toast.show('Failed to load sub-contract details.');
      },
    });
  }

  closeSubContractDetails(): void {
    this.subContractDetailsOpen.set(false);
    this.subContractDetails.set(null);
  }
  openWorkspaceTimeline(customer: Customer): void {
    this.workspaceTab = 'timeline';
    this.timelineLoading.set(true);
    this.customerTimeline.set([]);
    this.customerTimelineService.getByCustomer(customer.id).subscribe({
      next: (events) => {
        this.customerTimeline.set(Array.isArray(events) ? events : []);
        this.timelineLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load customer timeline:', error);
        this.timelineLoading.set(false);
        this.toast.show('Failed to load customer timeline.');
      },
    });
  }

  timelineEventTypeLabel(type: CustomerTimelineEventType): string {
    switch (type) {
      case CustomerTimelineEventType.CustomerCreated:
        return 'Created';
      case CustomerTimelineEventType.Activity:
        return 'Activity';
      case CustomerTimelineEventType.StageChangeRequested:
        return 'Stage Request';
      case CustomerTimelineEventType.StageChangeApproved:
        return 'Approved';
      case CustomerTimelineEventType.StageChangeRejected:
        return 'Rejected';
      case CustomerTimelineEventType.ContactAdded:
        return 'Contact Added';
      case CustomerTimelineEventType.CustomerAssigned:
        return 'Assigned';
      case CustomerTimelineEventType.PocOrPilot:
        return 'POC / Pilot';
      case CustomerTimelineEventType.Contract:
        return 'Contract';
      default:
        return 'Event';
    }
  }
  asCustomerStatus(value: number): CustomerStatus {
    return value as CustomerStatus;
  }
  timelineEventIcon(type: CustomerTimelineEventType): string {
    switch (type) {
      case CustomerTimelineEventType.CustomerCreated:
        return 'pi-flag';
      case CustomerTimelineEventType.Activity:
        return 'pi-comments';
      case CustomerTimelineEventType.StageChangeRequested:
        return 'pi-send';
      case CustomerTimelineEventType.StageChangeApproved:
        return 'pi-check-circle';
      case CustomerTimelineEventType.StageChangeRejected:
        return 'pi-times-circle';
      case CustomerTimelineEventType.ContactAdded:
        return 'pi-user-plus';
      case CustomerTimelineEventType.CustomerAssigned:
        return 'pi-user';
      case CustomerTimelineEventType.PocOrPilot:
        return 'pi-cog';
      case CustomerTimelineEventType.Contract:
        return 'pi-file';
      default:
        return 'pi-circle';
    }
  }
  timelineEventClass(type: CustomerTimelineEventType): string {
    switch (type) {
      case CustomerTimelineEventType.CustomerCreated:
        return 'timeline-event-created';
      case CustomerTimelineEventType.StageChangeApproved:
        return 'timeline-event-approved';
      case CustomerTimelineEventType.StageChangeRejected:
        return 'timeline-event-rejected';
      case CustomerTimelineEventType.StageChangeRequested:
        return 'timeline-event-pending';
      case CustomerTimelineEventType.PocOrPilot:
        return 'timeline-event-poc';
      case CustomerTimelineEventType.Contract:
        return 'timeline-event-contract';
      default:
        return '';
    }
  }
  readonly PocPilotType = PocPilotType;
  readonly pilotTypes = [
    { value: PocPilotType.ProofOfConcept, label: 'Proof of Concept' },
    { value: PocPilotType.OperationalPilot, label: 'Operational Pilot' },
    { value: PocPilotType.TechnicalPilot, label: 'Technical Pilot' },
  ];
  /** true إذا في contact في الـ workspace list حاليًا isPrimary — تُستخدم لتعطيل باقي أزرار الـ star */
  readonly hasWorkspacePrimaryContact = computed(() =>
    this.workspaceContacts().some((contact) => contact.isPrimary),
  );

  readonly contactDetailsOpen = signal(false);
  readonly contactDetails = signal<CustomerContact | null>(null);
  readonly contactDetailsLoading = signal(false);

  readonly salesUsers = signal<SalesUser[]>([]);
  readonly salesUsersLoading = signal(false);
  readonly engineers = signal<CustomerEngineer[]>([]);
  readonly engineersLoading = signal(false);
  readonly engineersLoaded = signal(false);
  readonly assignOpen = signal(false);
  readonly assignCustomer = signal<Customer | null>(null);
  readonly assigning = signal(false);
  assignSelectedUserId = '';
  workspaceTab: 'overview' | 'contacts' | 'poc' | 'contract' | 'timeline' | 'delivery' | 'serials' = 'overview';

  private readonly deliveryRequestService = inject(DeliveryRequestService);

  readonly deliverySubTab = signal<'create' | 'my-requests'>('create');

  readonly reservedSerials = signal<{ id: number; serialNumber: string; productName: string }[]>(
    [],
  );
  readonly reservedSerialsLoading = signal(false);

  loadReservedSerials(contractId: number): void {
    this.reservedSerialsLoading.set(true);
    this.deliveryRequestService.getReservedSerials(contractId).subscribe({
      next: (serials) => {
        const products = this.finishedProducts();
        this.reservedSerials.set(
          (Array.isArray(serials) ? serials : []).map((s) => ({
            id: s.id,
            serialNumber: s.serial,
            productName:
              products.find((p) => p.id === s.finishedProductId)?.name ??
              `Product #${s.finishedProductId}`,
          })),
        );
        this.reservedSerialsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load reserved serials:', error);
        this.reservedSerials.set([]);
        this.reservedSerialsLoading.set(false);
        this.toast.show('Failed to load reserved serials.');
      },
    });
  }

  private errorMessage(error: any, fallback: string): string {
    const e = error?.error;
    return (typeof e === 'string' && e) || e?.message || e?.detail || e?.title || fallback;
  }

  readonly deliveryActionSaving = signal(false);

  readonly customerEngineerRequests = computed(() => {
    const customerId = this.activeCustomer()?.id;
    return this.engineerRequests().filter((r) => r.customerId === customerId);
  });

  receivedPercent(received: number, total: number): number {
    return total ? Math.round((received / total) * 100) : 0;
  }

  canInstall(serial: { serialStatus: string }): boolean {
    return serial.serialStatus === 'Received';
  }

  deliveryStatusClass(status: string): string {
    return status === 'Rejected' || status === 'Cancelled' ? 'rejected' : '';
  }

  signedDocumentFullUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    const base = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${base}${path}`;
  }

  installSerial(serial: string): void {
    const details = this.selectedEngineerRequest();
    if (!details) return;

    this.deliveryActionSaving.set(true);
    this.deliveryRequestService.install(details.id, { serial }).subscribe({
      next: () => {
        this.deliveryActionSaving.set(false);
        this.toast.show(`Serial ${serial} marked as installed.`);
        this.refreshDeliveryRequest(details.id);
      },
      error: (error) => {
        console.error('Failed to install serial:', error);
        this.deliveryActionSaving.set(false);
        this.toast.show(error.error?.message || 'Failed to install serial.');
      },
    });
  }

  private refreshDeliveryRequest(id: number): void {
    this.openEngineerRequestDetails(id);
    this.loadEngineerRequests();
  }
  readonly selectedSerialIds = signal<number[]>([]);
  readonly creatingDeliveryRequest = signal(false);
  readonly engineerRequests = signal<EngineerDeliveryRequestListItem[]>([]);
  readonly engineerRequestsLoading = signal(false);
  readonly selectedEngineerRequest = signal<EngineerDeliveryRequestDetails | null>(null);
  readonly engineerRequestDetailsLoading = signal(false);
  readonly CustomerStatus = CustomerStatus;
  readonly customerStatuses = [
    { value: CustomerStatus.Customer, label: 'Customer' },
    { value: CustomerStatus.Contact, label: 'Contact' },
    { value: CustomerStatus.Lead, label: 'Lead' },
    { value: CustomerStatus.Qualified, label: 'Qualified' },
    { value: CustomerStatus.Opportunity, label: 'Opportunity' },
    { value: CustomerStatus.PocOrPilot, label: 'POC or Pilot' },
    { value: CustomerStatus.Negotiation, label: 'Negotiation' },
    { value: CustomerStatus.Contracted, label: 'Contracted' },
  ];
  readonly contactInfluences = [
    { value: ContactInfluence.Low, label: 'Low' },
    { value: ContactInfluence.Medium, label: 'Medium' },
    { value: ContactInfluence.High, label: 'High' },
  ];
  readonly dealRoles = [
    { value: DealRole.DecisionMaker, label: 'Decision Maker' },
    { value: DealRole.Influencer, label: 'Influencer' },
    { value: DealRole.Champion, label: 'Champion' },
    { value: DealRole.Gatekeeper, label: 'Gatekeeper' },
    { value: DealRole.EndUser, label: 'End User' },
    { value: DealRole.Procurement, label: 'Procurement' },
    { value: DealRole.TechnicalEvaluator, label: 'Technical Evaluator' },
    { value: DealRole.Other, label: 'Other' },
  ];

  formOpen = false;

  directConversionOpen = false;
  directConversionType: DirectConversionType = 'poc';
  directConversionCustomer: Customer | null = null;
  readonly deleteTarget = signal<DeleteTarget | null>(null);
  activitiesOpen = false;
  activitiesCustomer: Customer | null = null;
  activityFormOpen = false;
  activityFormCustomer: Customer | null = null;
  activityForm: CustomerActivityForm = createCustomerActivityForm();
  industriesOpen = false;
  industryEditingId: number | null = null;
  industryName = '';
  contactFormOpen = false;
  contactEditingId: number | null = null;
  contactForm: CustomerContactForm = createCustomerContactForm();
  readonly contactDeleteTarget = signal<CustomerContact | null>(null);
  contactFormCustomerId: number | null = null;
  readonly activityTypes = [
    { value: SalesActivityType.Call, label: 'Call' },
    { value: SalesActivityType.Email, label: 'Email' },
    { value: SalesActivityType.WhatsApp, label: 'WhatsApp' },
    { value: SalesActivityType.Meeting, label: 'Meeting' },
    { value: SalesActivityType.SiteVisit, label: 'Site Visit' },
    { value: SalesActivityType.Demo, label: 'Demo' },
    { value: SalesActivityType.Proposal, label: 'Proposal' },
    { value: SalesActivityType.FollowUp, label: 'Follow Up' },
    { value: SalesActivityType.Other, label: 'Other' },
  ];

  form: CustomerForm = createCustomerForm();

  readonly filteredCustomers = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.customers();
    return this.customers().filter((customer) =>
      [
        customer.companyName,
        customer.location,
        customer.phoneNumber,
        customer.email,
        customer.industryTypeName,
        customer.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  ngOnInit(): void {
    this.loadCustomers();
    this.loadIndustryTypes();
  }

  loadEngineerRequests(): void {
    this.engineerRequestsLoading.set(true);
    this.deliveryRequestService.getEngineerRequests().subscribe({
      next: (requests) => {
        this.engineerRequests.set(Array.isArray(requests) ? requests : []);
        this.engineerRequestsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load delivery requests:', error);
        this.engineerRequestsLoading.set(false);
        this.toast.show('Failed to load delivery requests.');
      },
    });
  }

  openEngineerRequestDetails(id: number): void {
    this.engineerRequestDetailsLoading.set(true);
    this.selectedEngineerRequest.set(null);
    this.deliveryRequestService.getEngineerRequestById(id).subscribe({
      next: (details) => {
        this.selectedEngineerRequest.set(details);
        this.engineerRequestDetailsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load delivery request details:', error);
        this.engineerRequestDetailsLoading.set(false);
        this.toast.show('Failed to load delivery request details.');
      },
    });
  }
  submitDeliveryRequest(): void {
    const contract = this.currentContract();
    const selected = this.selectedSerialIds();
    if (!contract) {
      this.toast.show('No DealDone contract found for this customer.');
      return;
    }
    if (!selected.length) {
      this.toast.show('Select at least one serial.');
      return;
    }

    this.creatingDeliveryRequest.set(true);
    this.deliveryRequestService
      .create({ customerContractId: contract.contractId, serialNumberIds: selected })
      .subscribe({
        next: (created) => {
          this.creatingDeliveryRequest.set(false);
          this.selectedSerialIds.set([]);
          this.toast.show(`Delivery request ${created?.requestNumber ?? ''} created successfully.`);
          this.loadReservedSerials(contract.contractId);
          this.deliverySubTab.set('my-requests');
          this.loadEngineerRequests();
          if (created?.id) this.openEngineerRequestDetails(created.id);
        },
        error: (error) => {
          console.error('Failed to create delivery request:', error);
          this.creatingDeliveryRequest.set(false);
          this.toast.show(this.errorMessage(error, 'Failed to create delivery request.'));
        },
      });
  }

  openWorkspaceDelivery(customer: Customer): void {
    this.workspaceTab = 'delivery';
    this.deliverySubTab.set('create');
    const contract = this.currentContract();
    if (contract) {
      this.loadReservedSerials(contract.contractId);
    } else {
      this.loadContract(customer.id);
    }
  }
  toggleSerialSelection(serialId: number): void {
    const current = this.selectedSerialIds();
    this.selectedSerialIds.set(
      current.includes(serialId) ? current.filter((id) => id !== serialId) : [...current, serialId],
    );
  }

  switchDeliverySubTab(tab: 'create' | 'my-requests'): void {
    this.deliverySubTab.set(tab);
    if (tab === 'my-requests') {
      this.loadEngineerRequests();
    }
  }
  loadIndustryTypes(): void {
    this.industryTypeService.getAll().subscribe({
      next: (types) => this.industryTypes.set(Array.isArray(types) ? types : []),
      error: (error) => {
        console.error('Failed to load industry types:', error);
        this.toast.show('Failed to load industry types.');
      },
    });
  }
  loadCustomers(): void {
    this.loading.set(true);
    this.customerService.getAll().subscribe({
      next: (customers) => {
        const customerList = (Array.isArray(customers) ? customers : []).map((customer) => ({
          ...customer,
          status: this.normalizeStatus(customer.status),
        }));
        this.customers.set(customerList);
        if (
          !this.activeCustomer() ||
          !customerList.some((customer) => customer.id === this.activeCustomer()?.id)
        ) {
          const nextActive = customerList[0] ?? null;
          this.activeCustomer.set(nextActive);
          if (nextActive) {
            this.workspaceTab = this.isEngineer
              ? 'delivery'
              : nextActive.status === CustomerStatus.Contracted
                ? 'contract'
                : 'overview';
          }
        }
        this.loading.set(false);
        const active = this.activeCustomer();
        if (active) {
          if (!this.isEngineer) {
            this.loadStageContext(active);
          }
          if (this.isEngineer || active.status === CustomerStatus.Contracted) {
            this.loadContract(active.id);
          }
        }
      },
      error: (error) => {
        console.error('Failed to load customers:', error);
        this.loading.set(false);
        this.toast.show('Failed to load customers.');
      },
    });
  }
  private normalizeStatus(raw: unknown): CustomerStatus {
    if (typeof raw === 'number') return raw as CustomerStatus;

    if (typeof raw === 'string') {
      const asNumber = Number(raw);
      if (!Number.isNaN(asNumber) && raw.trim() !== '') return asNumber as CustomerStatus;

      const match = this.customerStatuses.find(
        (status) => CustomerStatus[status.value].toLowerCase() === raw.toLowerCase(),
      );
      if (match) return match.value;
    }

    console.warn('Unrecognized customer status value:', raw);
    return CustomerStatus.Customer;
  }

  confirmApproveRequest(): void {
    const request = this.pendingRequest();
    if (!request) return;

    this.savingStageAction.set(true);
    this.stageChangeRequestService.approve(request.id).subscribe({
      next: () => {
        this.savingStageAction.set(false);
        this.toast.show('Stage change approved.');
        const customer = this.activeCustomer();
        if (customer) {
          this.loadStageContext(customer);
          this.loadCustomers();
        }
      },
      error: (error) => {
        console.error('Failed to approve stage change request:', error);
        this.savingStageAction.set(false);
        this.toast.show(error.error?.message || 'Failed to approve the request.');
      },
    });
  }

  approvePoc(isApproved: boolean): void {
    const customer = this.activeCustomer();
    const poc = this.stageDetails()?.pocOrPilot;
    const pocId = poc?.pocId ?? poc?.id;
    const statusName = this.pocApprovalStatusName();
    if (!customer || !pocId || !this.canApprovePocStep(statusName)) return;

    const payload: StageChangeApprovalPayload = {
      isApproved,
      comment: this.pocApprovalComment.trim(),
    };
    this.pocApprovalSaving.set(true);
    this.stageChangeRequestService.approvePoc(pocId, payload).subscribe({
      next: () => {
        this.pocApprovalSaving.set(false);
        this.pocApprovalComment = '';
        this.toast.show(isApproved ? 'POC approved.' : 'POC rejected.');
        this.loadStageContext(customer);
        this.loadCustomers();
      },
      error: (error) => {
        console.error('Failed to approve POC:', error);
        this.pocApprovalSaving.set(false);
        this.toast.show(error.error?.message || 'Failed to submit the POC decision.');
      },
    });
  }

  pocApprovalStatusName(): string {
    const details = this.stageDetails()?.pocOrPilot;
    const statusName = details?.statusName ?? details?.approvalStatusName;
    if (!statusName || statusName.toLowerCase() === 'pending') return 'PendingCcoApproval';
    return statusName;
  }

  private getAllowedNextStatuses(current: CustomerStatus): CustomerStatus[] {
    if (current === CustomerStatus.Contracted) return [];
    const next = (current + 1) as CustomerStatus;
    if (current === CustomerStatus.Opportunity) {
      return [next, CustomerStatus.Contracted];
    }
    return [next];
  }

  loadStageContext(customer: Customer): void {
    this.stageDetailsLoading.set(true);
    this.pendingRequestsLoading.set(true);
    forkJoin({
      details: this.customerService.getStageDetails(customer.id),
      pending: this.stageChangeRequestService.getPendingByCustomer(customer.id),
    }).subscribe({
      next: ({ details, pending }) => {
        this.stageDetails.set(details);
        this.pendingRequests.set(Array.isArray(pending) ? pending : []);
        this.stageDetailsLoading.set(false);
        this.pendingRequestsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load stage context:', error);
        this.stageDetailsLoading.set(false);
        this.pendingRequestsLoading.set(false);
      },
    });
  }

  openRequestUpgrade(): void {
    const customer = this.activeCustomer();
    if (!customer || this.hasPendingRequest()) return;
    const options = this.allowedNextStatuses();
    if (!options.length) return;
    this.upgradeForm = createStageUpgradeForm(options[0]);
    this.upgradeFormOpen = true;

    if (this.upgradeForm.toStatus === CustomerStatus.PocOrPilot) this.loadEngineers();
    this.loadUpgradeFormContacts(customer.id);
  }

  onUpgradeTargetStatusChange(status: CustomerStatus): void {
    if (status === CustomerStatus.PocOrPilot) this.loadEngineers();
  }

  private loadEngineers(): void {
    if (this.engineersLoaded() || this.engineersLoading()) return;

    this.engineersLoading.set(true);
    this.customerService.getEngineers().subscribe({
      next: (users) => {
        this.engineers.set(Array.isArray(users) ? users : []);
        this.engineersLoaded.set(true);
        this.engineersLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load engineers:', error);
        this.engineers.set([]);
        this.engineersLoading.set(false);
        this.toast.show('Failed to load engineers.');
      },
    });
  }

  private loadUpgradeFormContacts(customerId: number): void {
    this.customerContactService.getByCustomer(customerId).subscribe({
      next: (contacts) => this.upgradeFormContacts.set(Array.isArray(contacts) ? contacts : []),
      error: () => this.upgradeFormContacts.set([]),
    });
  }

  closeRequestUpgrade(): void {
    if (this.upgradeSaving()) return;
    this.upgradeFormOpen = false;
  }

  submitUpgradeRequest(): void {
    const customer = this.activeCustomer();
    if (!customer || !this.upgradeForm.toStatus) return;

    if (!this.upgradeForm.upgradeReason.trim()) {
      this.toast.show('Upgrade justification is required.');
      return;
    }

    if (this.upgradeForm.toStatus === CustomerStatus.PocOrPilot) {
      const pilot = this.upgradeForm.pilotDetails;
      if (
        !pilot.pilotTitle.trim() ||
        !pilot.pilotType ||
        !pilot.plannedStart ||
        !pilot.plannedEnd ||
        !pilot.technicalOwnerId ||
        !pilot.objective.trim() ||
        !pilot.successCriteria.trim()
      ) {
        this.toast.show('Please complete all POC/Pilot fields.');
        return;
      }
    }

    const payload: StageChangeRequestPayload = {
      toStatus: this.upgradeForm.toStatus,
      upgradeReason: this.upgradeForm.upgradeReason.trim(),
      targetDecisionDate: this.upgradeForm.targetDecisionDate
        ? new Date(this.upgradeForm.targetDecisionDate).toISOString()
        : new Date().toISOString(),
      evidences: this.upgradeForm.evidences.map(({ evidenceType, isCompleted, details }) => ({
        evidenceType,
        isCompleted,
        details,
      })),
    };

    if (this.upgradeForm.toStatus === CustomerStatus.Opportunity) {
      const details = this.upgradeForm.opportunityDetails;
      payload.opportunityDetails = {
        opportunityValue: Number(details.opportunityValue) || 0,
        winProbability: Number(details.winProbability) || 0,
        expectedCloseDate: details.expectedCloseDate
          ? new Date(details.expectedCloseDate).toISOString()
          : new Date().toISOString(),
        category: details.category ?? OpportunityCategory.IndustrialAutomation,
        priority: details.priority ?? OpportunityPriority.Strategic,
        businessNeed: details.businessNeed.trim(),
      };
    }

    if (this.upgradeForm.toStatus === CustomerStatus.PocOrPilot) {
      const pilot = this.upgradeForm.pilotDetails;
      payload.pocOrPilotDetails = {
        pilotTitle: pilot.pilotTitle.trim(),
        pilotType: pilot.pilotType!,
        plannedStart: new Date(pilot.plannedStart).toISOString(),
        plannedEnd: new Date(pilot.plannedEnd).toISOString(),
        technicalOwnerId: pilot.technicalOwnerId,
        objective: pilot.objective.trim(),
        successCriteria: pilot.successCriteria.trim(),
        billOfQuantity: pilot.resources
          .filter((resource) => resource.finishedProductId)
          .map((resource) => {
            const product = this.finishedProducts().find(
              (item) => item.id === resource.finishedProductId,
            );
            return {
              finishedProductId: resource.finishedProductId!,
              scope: resource.scope.trim(),
              item: product?.name ?? '',
              qty: Number(resource.qty) || 0,
            };
          }),
      };
    }
    if (this.upgradeForm.toStatus === CustomerStatus.Contracted) {
      const contract = this.upgradeForm.contractDetails;
      if (
        !contract.contractTitle.trim() ||
        !contract.contractStartDate ||
        !contract.contractEndDate ||
        !contract.terms.trim()
      ) {
        this.toast.show('Please complete all contract fields.');
        return;
      }
    }
    if (this.upgradeForm.toStatus === CustomerStatus.Contracted) {
      const contract = this.upgradeForm.contractDetails;
      payload.contractDetails = {
        contractTitle: contract.contractTitle.trim(),
        contractStartDate: new Date(contract.contractStartDate).toISOString(),
        contractEndDate: new Date(contract.contractEndDate).toISOString(),
        exclusions: contract.exclusions.trim(),
        terms: contract.terms.trim(),
        comment: contract.comment.trim(),
        billOfQuantity: contract.resources
          .filter((resource) => resource.finishedProductId)
          .map((resource) => {
            const product = this.finishedProducts().find(
              (p) => p.id === resource.finishedProductId,
            );
            return {
              finishedProductId: resource.finishedProductId!,
              scope: resource.scope.trim(),
              item: product?.name ?? '',
              qty: Number(resource.qty) || 0,
            };
          }),
      };
    }
    this.upgradeSaving.set(true);
    this.stageChangeRequestService.create(customer.id, payload).subscribe({
      next: () => {
        this.upgradeSaving.set(false);
        this.upgradeFormOpen = false;
        this.toast.show(
          this.upgradeForm.toStatus === CustomerStatus.PocOrPilot
            ? 'POC/Pilot request submitted for approval.'
            : this.upgradeForm.toStatus === CustomerStatus.Contracted
              ? 'Contract request submitted for approval.'
              : 'Stage upgrade request submitted for approval.',
        );
        this.loadStageContext(customer);
      },
      error: (error) => {
        console.error('Failed to submit stage upgrade request:', error);
        this.upgradeSaving.set(false);
        this.toast.show(error.error?.message || 'Failed to submit stage upgrade request.');
      },
    });
  }

  openRejectRequest(): void {
    this.rejectReason = '';
    this.rejectRequestOpen = true;
  }

  closeRejectRequest(): void {
    if (this.savingStageAction()) return;
    this.rejectRequestOpen = false;
  }

  confirmRejectRequest(): void {
    const request = this.pendingRequest();
    if (!request) return;
    if (!this.rejectReason.trim()) {
      this.toast.show('Rejection reason is required.');
      return;
    }

    this.savingStageAction.set(true);
    this.stageChangeRequestService
      .reject(request.id, { rejectionReason: this.rejectReason.trim() })
      .subscribe({
        next: () => {
          this.savingStageAction.set(false);
          this.rejectRequestOpen = false;
          this.toast.show('Stage change request returned.');
          const customer = this.activeCustomer();
          if (customer) this.loadStageContext(customer);
        },
        error: (error) => {
          console.error('Failed to reject stage change request:', error);
          this.savingStageAction.set(false);
          this.toast.show(error.error?.message || 'Failed to return the request.');
        },
      });
  }

  addContractResource(): void {
    this.upgradeForm.contractDetails.resources.push({
      scope: '',
      finishedProductId: null,
      qty: null,
    });
  }
  removeContractResource(index: number): void {
    this.upgradeForm.contractDetails.resources.splice(index, 1);
  }
  addPilotResource(): void {
    this.upgradeForm.pilotDetails.resources.push({ scope: '', finishedProductId: null, qty: null });
  }

  removePilotResource(index: number): void {
    this.upgradeForm.pilotDetails.resources.splice(index, 1);
  }

  get canRequestStageChange(): boolean {
    return this.authService.hasAnyRole(['CCO']);
  }

  openCreate(): void {
    this.form = createCustomerForm();
    this.form.industryTypeId = this.industryTypes()[0]?.id ?? 0;
    this.customerContacts.set([]);
    this.resetContactForm();
    this.formOpen = true;
  }
  openEdit(customer: Customer): void {
    this.form = {
      id: customer.id,
      companyName: customer.companyName,
      location: customer.location ?? '',
      region: customer.region ?? '',
      country: customer.country ?? '',
      city: customer.city ?? '',
      website: customer.website ?? '',
      phoneNumber: customer.phoneNumber,
      email: customer.email,
      industryTypeId: customer.industryTypeId,
      notes: customer.notes ?? '',
    };
    this.resetContactForm();
    this.loadCustomerContacts(customer.id);
    this.formOpen = true;
  }

  closeForm(): void {
    if (this.saving()) return;
    this.formOpen = false;
    this.customerContacts.set([]);
    this.resetContactForm();
  }

  saveCustomer(): void {
    if (!this.form.companyName.trim()) {
      this.toast.show('Company name is required.');
      return;
    }
    if (!this.isValidName(this.form.companyName)) {
      this.toast.show('Company name must contain letters only.');
      return;
    }
    if (!this.form.industryTypeId || this.form.industryTypeId < 1) {
      this.toast.show('Please select an industry type.');
      return;
    }
    if (!this.isValidUrl(this.form.location)) {
      this.toast.show('Location must be a valid link.');
      return;
    }
    if (!this.form.region.trim()) {
      this.toast.show('Region is required.');
      return;
    }
    if (!this.form.city.trim()) {
      this.toast.show('City is required.');
      return;
    }
    if (!this.form.country.trim()) {
      this.toast.show('Country is required.');
      return;
    }
    if (!this.form.website.trim()) {
      this.toast.show('Website is required.');
      return;
    }

    if (!this.form.phoneNumber.trim()) {
      this.toast.show('Phone number is required.');
      return;
    }
    if (!this.isValidPhone(this.form.phoneNumber)) {
      this.toast.show('Phone number must be 11 digits (e.g. 01xxxxxxxxx).');
      return;
    }
    if (!this.form.email.trim()) {
      this.toast.show('Email is required.');
      return;
    }
    if (!this.isValidEmail(this.form.email)) {
      this.toast.show('Please enter a valid email address.');
      return;
    }
    if (!this.form.notes.trim()) {
      this.toast.show('Notes are required.');
      return;
    }

    const id = this.form.id;
    const payload: CustomerPayload = {
      companyName: this.form.companyName.trim(),
      industryTypeId: Number(this.form.industryTypeId),
    };
    this.addOptionalText(payload, 'location', this.form.location);
    this.addOptionalText(payload, 'region', this.form.region);
    this.addOptionalText(payload, 'country', this.form.country);
    this.addOptionalText(payload, 'city', this.form.city);
    this.addOptionalText(payload, 'website', this.form.website);
    this.addOptionalText(payload, 'phoneNumber', this.form.phoneNumber);
    this.addOptionalText(payload, 'email', this.form.email);
    this.addOptionalText(payload, 'notes', this.form.notes);

    this.saving.set(true);

    if (id) {
      this.customerService.update(id, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.formOpen = false;
          this.toast.show('Customer updated successfully.');
          this.loadCustomers();
        },
        error: (error) => {
          console.error('Failed to save customer:', error);
          this.saving.set(false);
          this.toast.show(error.error?.message || 'Failed to save customer.');
        },
      });
      return;
    }

    this.customerService.create(payload).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.form.id = created.id;
        this.toast.show('Customer created successfully. You can now add contacts.');
        this.loadCustomers();
        this.loadCustomerContacts(created.id);
      },
      error: (error) => {
        console.error('Failed to save customer:', error);
        this.saving.set(false);
        this.toast.show(error.error?.message || 'Failed to save customer.');
      },
    });
  }

  deleteCustomer(customer: Customer): void {
    this.deleteTarget.set({ type: 'customer', item: customer });
  }

  deleteIndustry(industry: IndustryType): void {
    this.deleteTarget.set({ type: 'industry', item: industry });
  }

  closeDeleteConfirmation(): void {
    if (this.saving()) return;
    this.deleteTarget.set(null);
  }

  openActivities(customer: Customer): void {
    this.activitiesCustomer = customer;
    this.activitiesOpen = true;
    this.activitiesLoading.set(true);
    this.customerActivitiesList.set([]);

    this.customerActivityService.getByCustomer(customer.id).subscribe({
      next: (activities) => {
        const sorted = [...(Array.isArray(activities) ? activities : [])].sort(
          (first, second) =>
            new Date(second.activityDate).getTime() - new Date(first.activityDate).getTime(),
        );
        this.customerActivitiesList.set(sorted);
        this.activitiesLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load customer activities:', error);
        this.activitiesLoading.set(false);
        this.toast.show(error.error?.message || 'Failed to load customer activities.');
      },
    });
  }
  addActivity(customer: Customer): void {
    this.activityFormCustomer = customer;
    this.activityEditingId = null;
    this.activityForm = createCustomerActivityForm();
    this.activityFormOpen = true;
  }

  editActivity(activity: CustomerActivity): void {
    this.activityFormCustomer = this.activitiesCustomer;
    this.activityEditingId = activity.id;
    this.activityForm = {
      activityType: activity.activityType,
      subject: activity.subject,
      notes: activity.notes ?? '',
      activityDate: this.toLocalDateTimeInput(activity.activityDate),
      nextFollowUpDate: activity.nextFollowUpDate
        ? this.toLocalDateTimeInput(activity.nextFollowUpDate)
        : '',
    };
    this.activityFormOpen = true;
  }

  private toLocalDateTimeInput(isoDate: string): string {
    const date = new Date(isoDate);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  }
  closeActivityForm(): void {
    if (this.saving()) return;
    this.activityFormOpen = false;
    this.activityFormCustomer = null;
    this.activityEditingId = null;
  }
  saveCustomerActivity(): void {
    const customer = this.activityFormCustomer;
    if (!customer) return;
    if (!this.activityForm.subject.trim() || !this.activityForm.activityDate) {
      this.toast.show('Subject and activity date are required.');
      return;
    }

    const basePayload = {
      activityType: Number(this.activityForm.activityType),
      subject: this.activityForm.subject.trim(),
      activityDate: new Date(this.activityForm.activityDate).toISOString(),
      ...(this.activityForm.notes.trim() ? { notes: this.activityForm.notes.trim() } : {}),
      ...(this.activityForm.nextFollowUpDate
        ? { nextFollowUpDate: new Date(this.activityForm.nextFollowUpDate).toISOString() }
        : {}),
    };

    this.saving.set(true);

    if (this.activityEditingId) {
      this.customerActivityService
        .update(this.activityEditingId, basePayload as CustomerActivityUpdatePayload)
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.activityFormOpen = false;
            this.activityFormCustomer = null;
            this.toast.show('Activity updated successfully.');
            this.openActivities(customer);
          },
          error: (error) => {
            this.saving.set(false);
            this.toast.show(error.error?.message || 'Failed to update activity.');
          },
        });
      return;
    }

    const payload: CustomerActivityPayload = { customerId: customer.id, ...basePayload };
    this.customerActivityService.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.activityFormOpen = false;
        this.activityFormCustomer = null;
        this.toast.show('Activity added successfully.');
        this.openActivities(customer);
      },
      error: (error) => {
        this.saving.set(false);
        this.toast.show(error.error?.message || 'Failed to add activity.');
      },
    });
  }
  readonly activityDeleteTarget = signal<CustomerActivity | null>(null);

  deleteActivity(activity: CustomerActivity): void {
    this.activityDeleteTarget.set(activity);
  }

  closeActivityDeleteConfirmation(): void {
    if (this.saving()) return;
    this.activityDeleteTarget.set(null);
  }

  confirmActivityDelete(): void {
    const target = this.activityDeleteTarget();
    const customer = this.activitiesCustomer;
    if (!target || !customer) return;

    this.saving.set(true);
    this.customerActivityService.delete(target.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.activityDeleteTarget.set(null);
        this.toast.show('Activity deleted successfully.');
        this.openActivities(customer);
      },
      error: (error) => {
        this.saving.set(false);
        this.toast.show(error.error?.message || 'Failed to delete activity.');
      },
    });
  }
  closeActivities(): void {
    this.activitiesOpen = false;
    this.activitiesCustomer = null;
    this.customerActivitiesList.set([]);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.saving.set(true);
    const request =
      target.type === 'customer'
        ? this.customerService.delete(target.item.id)
        : this.industryTypeService.delete(target.item.id);

    request.subscribe({
      next: () => {
        this.saving.set(false);

        this.deleteTarget.set(null);
        if (target.type === 'customer') {
          this.toast.show('Customer deleted successfully.');
          this.loadCustomers();
        } else {
          this.toast.show('Industry type deleted successfully.');
          this.loadIndustryTypes();
        }
      },
      error: (error) => {
        console.error(`Failed to delete ${target.type}:`, error);
        this.saving.set(false);
        this.toast.show(error.error?.message || `Failed to delete ${target.type}.`);
      },
    });
  }

  convertToPoc(customer: Customer): void {
    this.openDirectConversion(customer, 'poc');
  }

  convertToProject(customer: Customer): void {
    this.openDirectConversion(customer, 'project');
  }

  closeDirectConversion(): void {
    if (this.saving()) return;
    this.directConversionOpen = false;
    this.directConversionCustomer = null;
  }

  confirmDirectConversion(): void {
    const customer = this.directConversionCustomer;
    if (!customer) return;

    const target = this.directConversionType === 'poc' ? 'POC' : 'Project';
    const request: Observable<unknown> =
      this.directConversionType === 'poc'
        ? this.customerService.convertToPoc(customer.id)
        : this.customerService.convertToProject(customer.id);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.directConversionOpen = false;
        this.directConversionCustomer = null;
        this.toast.show(`Customer converted to ${target} successfully.`);
        this.loadCustomers();
      },
      error: (error) => {
        console.error(`Failed to convert customer to ${target}:`, error);
        this.saving.set(false);
        this.toast.show(error.error?.message || `Failed to convert customer to ${target}.`);
      },
    });
  }

  statusLabel(status: CustomerStatus): string {
    return this.customerStatuses.find((item) => item.value === status)?.label ?? 'Unknown';
  }

  selectCustomer(customer: Customer): void {
    this.selectedEngineerRequest.set(null);
    this.selectedSerialIds.set([]);
    this.deliverySubTab.set('create');
    this.activeCustomer.set(customer);
    this.expandedSubContractId.set(null);
    this.subContractSerials.set({});

    this.reservedSerials.set([]);

    this.selectedSerialsBySub.set({});
    this.workspaceTab = this.isEngineer
      ? 'delivery'
      : customer.status === CustomerStatus.Contracted
        ? 'contract'
        : 'overview';
    this.reservedSerials.set([]);
    if (!this.isEngineer) {
      this.loadStageContext(customer);
    }
    if (this.isEngineer || customer.status === CustomerStatus.Contracted) {
      this.loadContract(customer.id);
    }
  }
  openWorkspaceContacts(customer: Customer): void {
    this.workspaceTab = 'contacts';
    this.workspaceContactsLoading.set(true);
    this.workspaceContacts.set([]);
    this.customerContactService.getByCustomer(customer.id).subscribe({
      next: (contacts) => {
        this.workspaceContacts.set(Array.isArray(contacts) ? contacts : []);
        this.workspaceContactsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load customer contacts:', error);
        this.workspaceContactsLoading.set(false);
        this.toast.show('Failed to load customer contacts.');
      },
    });
  }

  openWorkspaceAddContact(customer: Customer): void {
    this.openAddContact(customer.id);
  }

  onBusinessCardSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.contactForm.businessCard = input.files?.[0] ?? null;
  }

  /** Builds an absolute URL for a contact's uploaded business card (API returns a relative path). */
  businessCardFullUrl(contact: CustomerContact): string | null {
    if (!contact.businessCardUrl) return null;
    const base = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${base}${contact.businessCardUrl}`;
  }

  businessCardFileName(contact: CustomerContact): string {
    if (!contact.businessCardUrl) return '';
    const segment = contact.businessCardUrl.split('/').pop() ?? 'business-card';
    return decodeURIComponent(segment);
  }

  uploadBusinessCard(contact: CustomerContact, file: File): void {
    const payload: CustomerContactUpdatePayload = {
      name: contact.name,
      isPrimary: contact.isPrimary,
      businessCard: file,
    };
    this.addOptionalText(payload, 'jobTitle', contact.jobTitle ?? '');
    this.addOptionalText(payload, 'department', contact.department ?? '');
    this.addOptionalText(payload, 'phoneNumber', contact.phoneNumber ?? '');
    this.addOptionalText(payload, 'alternativePhoneNumber', contact.alternativePhoneNumber ?? '');
    this.addOptionalText(payload, 'email', contact.email ?? '');
    this.addOptionalText(payload, 'notes', contact.notes ?? '');
    if (contact.influence != null) payload.influence = contact.influence;
    if (contact.dealRole != null) payload.dealRole = contact.dealRole;

    this.customerContactService.update(contact.id, payload).subscribe({
      next: () => {
        this.toast.show('Business card uploaded.');
        const customer = this.activeCustomer();
        if (customer) this.openWorkspaceContacts(customer);
      },
      error: (error) => {
        console.error('Failed to upload business card:', error);
        this.toast.show(error.error?.message || 'Failed to upload business card.');
      },
    });
  }

  toggleWorkspacePrimary(contact: CustomerContact): void {
    if (contact.isPrimary) {
      this.removeWorkspacePrimary(contact);
    } else if (!this.hasWorkspacePrimaryContact()) {
      this.setWorkspacePrimary(contact);
    }
  }

  private setWorkspacePrimary(contact: CustomerContact): void {
    this.savingContact.set(true);
    this.customerContactService.setPrimary(contact.id).subscribe({
      next: () => {
        this.savingContact.set(false);
        this.toast.show('Primary contact updated.');
        this.refreshContactsFor(contact.customerId);
      },
      error: (error) => {
        console.error('Failed to set primary contact:', error);
        this.savingContact.set(false);
        this.toast.show(error.error?.message || 'Failed to set primary contact.');
      },
    });
  }

  private removeWorkspacePrimary(contact: CustomerContact): void {
    const payload: CustomerContactUpdatePayload = { name: contact.name, isPrimary: false };
    this.addOptionalText(payload, 'jobTitle', contact.jobTitle ?? '');
    this.addOptionalText(payload, 'department', contact.department ?? '');
    this.addOptionalText(payload, 'phoneNumber', contact.phoneNumber ?? '');
    this.addOptionalText(payload, 'alternativePhoneNumber', contact.alternativePhoneNumber ?? '');
    this.addOptionalText(payload, 'email', contact.email ?? '');
    this.addOptionalText(payload, 'notes', contact.notes ?? '');
    if (contact.influence != null) payload.influence = contact.influence;
    if (contact.dealRole != null) payload.dealRole = contact.dealRole;

    this.savingContact.set(true);
    this.customerContactService.update(contact.id, payload).subscribe({
      next: () => {
        this.savingContact.set(false);
        this.toast.show('Primary contact removed.');
        this.refreshContactsFor(contact.customerId);
      },
      error: (error) => {
        console.error('Failed to remove primary contact:', error);
        this.savingContact.set(false);
        this.toast.show(error.error?.message || 'Failed to remove primary contact.');
      },
    });
  }

  /** يعمل reload لأي مكان الـ contacts ظاهرة فيه (المودال أو الـ workspace tab) بتاع الكستمر ده */
  private refreshContactsFor(customerId: number): void {
    if (this.form.id === customerId) {
      this.loadCustomerContacts(customerId);
    }
    const workspaceCustomer = this.activeCustomer();
    if (workspaceCustomer?.id === customerId && this.workspaceTab === 'contacts') {
      this.openWorkspaceContacts(workspaceCustomer);
    }
  }

  openIndustries(): void {
    this.resetIndustryForm();
    this.industriesOpen = true;
  }

  editIndustry(industry: IndustryType): void {
    this.industryEditingId = industry.id;
    this.industryName = industry.name;
  }

  saveIndustry(): void {
    const name = this.industryName.trim();
    if (!name) {
      this.toast.show('Industry name is required.');
      return;
    }
    if (!this.isValidIndustryName(name)) {
      this.toast.show('Industry name must be at least 3 characters, letters and underscores only.');
      return;
    }
    this.saving.set(true);
    const request = this.industryEditingId
      ? this.industryTypeService.update(this.industryEditingId, { name })
      : this.industryTypeService.create({ name });
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.resetIndustryForm();
        this.loadIndustryTypes();
        this.toast.show('Industry type saved successfully.');
      },
      error: (error) => {
        console.error('Failed to save industry type:', error);
        this.saving.set(false);
        this.toast.show(error.error?.message || 'Failed to save industry type.');
      },
    });
  }

  resetIndustryForm(): void {
    this.industryEditingId = null;
    this.industryName = '';
  }

  openAssign(customer: Customer): void {
    this.assignCustomer.set(customer);
    this.assignSelectedUserId = customer.assignedToId ?? '';
    this.assignOpen.set(true);
    if (!this.salesUsers().length) {
      this.loadSalesUsers();
    }
  }

  loadSalesUsers(): void {
    this.salesUsersLoading.set(true);
    this.customerService.getSalesUsers().subscribe({
      next: (users) => {
        this.salesUsers.set(Array.isArray(users) ? users : []);
        this.salesUsersLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load sales users:', error);
        this.salesUsersLoading.set(false);
        this.toast.show('Failed to load sales users.');
      },
    });
  }

  closeAssign(): void {
    if (this.assigning()) return;
    this.assignOpen.set(false);
    this.assignCustomer.set(null);
    this.assignSelectedUserId = '';
  }

  confirmAssign(): void {
    const customer = this.assignCustomer();
    if (!customer || !this.assignSelectedUserId) {
      this.toast.show('Please select a sales owner.');
      return;
    }
    this.assigning.set(true);
    this.customerService
      .assign(customer.id, { assignedToId: this.assignSelectedUserId })
      .subscribe({
        next: () => {
          this.assigning.set(false);
          this.assignOpen.set(false);
          this.assignCustomer.set(null);
          this.toast.show('Customer assigned successfully.');
          this.loadCustomers();
        },
        error: (error) => {
          console.error('Failed to assign customer:', error);
          this.assigning.set(false);
          this.toast.show(error.error?.message || 'Failed to assign customer.');
        },
      });
  }

  private addOptionalText<T extends object>(payload: T, key: keyof T, value: string): void {
    const trimmedValue = value.trim();
    if (trimmedValue) payload[key] = trimmedValue as T[keyof T];
  }

  private openDirectConversion(customer: Customer, type: DirectConversionType): void {
    this.directConversionCustomer = customer;
    this.directConversionType = type;
    this.directConversionOpen = true;
  }
  get canManage(): boolean {
    return this.authService.hasAnyRole(['CEO', 'Sales', 'CCO']);
  }

  get isCEO(): boolean {
    return this.authService.hasAnyRole(['CEO']);
  }
  get canReviewStageRequest(): boolean {
    return this.authService.hasAnyRole(['CEO', 'CCO']);
  }
  loadCustomerContacts(customerId: number): void {
    this.contactsLoading.set(true);
    this.customerContactService.getByCustomer(customerId).subscribe({
      next: (contacts) => {
        this.customerContacts.set(Array.isArray(contacts) ? contacts : []);
        this.contactsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load customer contacts:', error);
        this.contactsLoading.set(false);
        this.toast.show('Failed to load customer contacts.');
      },
    });
  }

  openAddContact(customerId: number): void {
    this.contactFormCustomerId = customerId;
    this.resetContactForm();
    this.contactFormOpen = true;
  }
  openEditContact(contact: CustomerContact): void {
    this.contactFormCustomerId = contact.customerId;
    this.contactEditingId = contact.id;
    this.contactForm = {
      name: contact.name,
      jobTitle: contact.jobTitle ?? '',
      department: contact.department ?? '',
      phoneNumber: contact.phoneNumber ?? '',
      alternativePhoneNumber: contact.alternativePhoneNumber ?? '',
      email: contact.email ?? '',
      isPrimary: contact.isPrimary,
      influence: contact.influence ?? null,
      dealRole: contact.dealRole ?? null,
      businessCard: null,
      notes: contact.notes ?? '',
    };
    this.contactFormOpen = true;
  }

  closeContactForm(): void {
    if (this.savingContact()) return;
    this.contactFormOpen = false;
    this.contactFormCustomerId = null;
    this.resetContactForm();
  }

  saveContact(): void {
    const customerId = this.contactFormCustomerId;
    if (!customerId) {
      this.toast.show('Save the customer before adding contacts.');
      return;
    }
    if (!this.contactForm.name.trim()) {
      this.toast.show('Contact name is required.');
      return;
    }
    if (!this.isValidName(this.contactForm.name)) {
      this.toast.show('Contact name must contain letters only.');
      return;
    }
    if (!this.contactForm.jobTitle.trim()) {
      this.toast.show('Job title is required.');
      return;
    }
    if (!this.contactForm.department.trim()) {
      this.toast.show('Department is required.');
      return;
    }
    if (!this.contactForm.phoneNumber.trim()) {
      this.toast.show('Phone number is required.');
      return;
    }
    if (!this.isValidPhone(this.contactForm.phoneNumber)) {
      this.toast.show('Phone number must be 11 digits (e.g. 01xxxxxxxxx).');
      return;
    }
    if (!this.isValidPhone(this.contactForm.alternativePhoneNumber)) {
      this.toast.show('Alternative phone number must be 11 digits.');
      return;
    }
    if (!this.contactForm.email.trim()) {
      this.toast.show('Email is required.');
      return;
    }
    if (!this.isValidEmail(this.contactForm.email)) {
      this.toast.show('Please enter a valid email address.');
      return;
    }
    if (this.contactForm.influence == null) {
      this.toast.show('Influence is required.');
      return;
    }
    if (this.contactForm.dealRole == null) {
      this.toast.show('Deal role is required.');
      return;
    }
    if (!this.contactEditingId && !this.contactForm.businessCard) {
      this.toast.show('Business card is required.');
      return;
    }
    if (!this.contactForm.notes.trim()) {
      this.toast.show('Notes are required.');
      return;
    }
    const payload: CustomerContactUpdatePayload = { name: this.contactForm.name.trim() };
    this.addOptionalText(payload, 'jobTitle', this.contactForm.jobTitle);
    this.addOptionalText(payload, 'department', this.contactForm.department);
    this.addOptionalText(payload, 'phoneNumber', this.contactForm.phoneNumber);
    this.addOptionalText(
      payload,
      'alternativePhoneNumber',
      this.contactForm.alternativePhoneNumber,
    );
    this.addOptionalText(payload, 'email', this.contactForm.email);
    this.addOptionalText(payload, 'notes', this.contactForm.notes);
    payload.isPrimary = this.contactForm.isPrimary;
    if (this.contactForm.influence != null) payload.influence = this.contactForm.influence;
    if (this.contactForm.dealRole != null) payload.dealRole = this.contactForm.dealRole;
    if (this.contactForm.businessCard) payload.businessCard = this.contactForm.businessCard;

    const editingId = this.contactEditingId;
    const wantsPrimary = this.contactForm.isPrimary;

    this.savingContact.set(true);
    const request = editingId
      ? this.customerContactService.update(editingId, payload)
      : this.customerContactService.create({ ...payload, customerId } as CustomerContactPayload);

    request.subscribe({
      next: (savedContact) => {
        if (wantsPrimary && !savedContact.isPrimary) {
          this.customerContactService.setPrimary(savedContact.id).subscribe({
            next: () => this.finishContactSave(customerId, editingId),
            error: () => this.finishContactSave(customerId, editingId),
          });
        } else {
          this.finishContactSave(customerId, editingId);
        }
      },
      error: (error) => {
        console.error('Failed to save contact:', error);
        this.savingContact.set(false);
        this.toast.show(error.error?.message || 'Failed to save contact.');
      },
    });
  }

  setContactPrimary(contact: CustomerContact): void {
    if (contact.isPrimary || !this.form.id) return;
    const customerId = this.form.id;
    this.savingContact.set(true);
    this.customerContactService.setPrimary(contact.id).subscribe({
      next: () => {
        this.savingContact.set(false);
        this.toast.show('Primary contact updated.');
        this.loadCustomerContacts(customerId);
      },
      error: (error) => {
        console.error('Failed to set primary contact:', error);
        this.savingContact.set(false);
        this.toast.show(error.error?.message || 'Failed to set primary contact.');
      },
    });
  }

  deleteContact(contact: CustomerContact): void {
    this.contactDeleteTarget.set(contact);
  }

  closeContactDeleteConfirmation(): void {
    if (this.savingContact()) return;
    this.contactDeleteTarget.set(null);
  }

  confirmContactDelete(): void {
    const target = this.contactDeleteTarget();
    if (!target) return;
    const customerId = target.customerId;

    this.savingContact.set(true);
    this.customerContactService.delete(target.id).subscribe({
      next: () => {
        this.savingContact.set(false);
        this.contactDeleteTarget.set(null);
        this.toast.show('Contact deleted successfully.');
        this.refreshContactsFor(customerId);
      },
      error: (error) => {
        console.error('Failed to delete contact:', error);
        this.savingContact.set(false);
        this.toast.show(error.error?.message || 'Failed to delete contact.');
      },
    });
  }

  private finishContactSave(customerId: number, editingId: number | null): void {
    this.savingContact.set(false);
    this.contactFormOpen = false;
    this.resetContactForm();
    this.toast.show(editingId ? 'Contact updated successfully.' : 'Contact added successfully.');
    this.loadCustomerContacts(customerId);
    const workspaceCustomer = this.activeCustomer();
    if (workspaceCustomer?.id === customerId && this.workspaceTab === 'contacts') {
      this.openWorkspaceContacts(workspaceCustomer);
    }
  }

  private resetContactForm(): void {
    this.contactEditingId = null;
    this.contactForm = createCustomerContactForm();
  }

  openContactDetails(contact: CustomerContact): void {
    this.contactDetailsOpen.set(true);
    this.contactDetailsLoading.set(true);
    this.contactDetails.set(null);
    this.customerContactService.getById(contact.id).subscribe({
      next: (details) => {
        this.contactDetails.set(details);
        this.contactDetailsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load contact details:', error);
        this.contactDetailsLoading.set(false);
        this.toast.show('Failed to load contact details.');
      },
    });
  }

  closeContactDetails(): void {
    this.contactDetailsOpen.set(false);
    this.contactDetails.set(null);
  }

  // ----- Validation helpers -----
  isValidIndustryName(value: string): boolean {
    return validateIndustryName(value);
  }

  sanitizeIndustryName(value: string): string {
    return sanitizeIndustryValue(value);
  }
  restrictToLetters(event: Event): void {
    sanitizeLettersInput(event);
  }

  restrictToDigits(event: Event): void {
    sanitizeDigitsInput(event);
  }
  isValidName(value: string): boolean {
    return isValidCustomerName(value);
  }

  isValidPhone(value: string): boolean {
    return isValidCustomerPhone(value);
  }

  isValidEmail(value: string): boolean {
    return isValidCustomerEmail(value);
  }

  private readonly masterDataService = inject(MasterDataService);
  readonly finishedProducts = this.masterDataService.PRODUCTS;
}
