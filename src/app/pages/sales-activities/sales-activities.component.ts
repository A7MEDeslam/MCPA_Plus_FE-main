import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Customer, CustomerStatus, SalesActivityType } from '../../models/customer.models';
import {
  CreateSalesActivityPayload,
  SalesActivity,
  SalesActivityKind,
  UpdateSalesActivityPayload,
} from '../../models/sales-activity.models';
import { CustomerService } from '../../services/customer.service';
import { SalesActivityService } from '../../services/sales-activity.service';
import { ToastService } from '../../services/toast.service';

interface ActivityForm {
  id: number | null;
  customerId: number;
  activityType: number;
  subject: string;
  notes: string;
  activityDate: string;
  nextFollowUpDate: string;
}

@Component({
  selector: 'app-sales-activities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales-activities.component.html',
  styleUrl: './sales-activities.component.css',
})
export class SalesActivitiesComponent implements OnInit {
  private readonly service = inject(SalesActivityService);
  private readonly customerService = inject(CustomerService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly activities = signal<SalesActivity[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  kind: SalesActivityKind = 'lead';
  customerIdFilter = 0;
  createdByUserIdFilter = '';
  formOpen = false;
  deleteTarget: SalesActivity | null = null;
  form: ActivityForm = this.emptyForm();

  readonly eligibleCustomers = computed(() =>
    this.customers().filter((customer) =>
      this.kind === 'lead'
        ? customer.status === CustomerStatus.Lead
        : customer.status === CustomerStatus.Opportunity,
    ),
  );

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

  ngOnInit(): void {
    const requestedKind = this.route.snapshot.queryParamMap.get('kind');
    if (requestedKind === 'lead' || requestedKind === 'opportunity') this.kind = requestedKind;
    const requestedCustomerId = Number(this.route.snapshot.queryParamMap.get('customerId'));
    if (requestedCustomerId > 0) this.customerIdFilter = requestedCustomerId;

    this.customerService.getAll().subscribe({
      next: (customers) => {
        this.customers.set(Array.isArray(customers) ? customers : []);
        if (this.route.snapshot.queryParamMap.get('create') === 'true') this.openCreate();
      },
      error: () => this.toast.show('Failed to load customers.'),
    });
    this.loadActivities();
  }

  selectKind(kind: SalesActivityKind): void {
    if (this.kind === kind) return;
    this.kind = kind;
    this.customerIdFilter = 0;
    this.loadActivities();
  }

  loadActivities(): void {
    this.loading.set(true);
    this.service
      .getAll(this.kind, {
        customerId: this.customerIdFilter || undefined,
        createdByUserId: this.createdByUserIdFilter || undefined,
      })
      .subscribe({
        next: (activities) => {
          this.activities.set(Array.isArray(activities) ? activities : []);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Failed to load sales activities:', error);
          this.loading.set(false);
          this.toast.show(error.error?.message || 'Failed to load activities.');
        },
      });
  }

  clearFilters(): void {
    this.customerIdFilter = 0;
    this.createdByUserIdFilter = '';
    this.loadActivities();
  }

  openCreate(): void {
    this.form = this.emptyForm();
    this.form.customerId = this.customerIdFilter || 0;
    if (
      this.form.customerId &&
      !this.eligibleCustomers().some((customer) => customer.id === this.form.customerId)
    ) {
      this.form.customerId = 0;
    }
    this.formOpen = true;
  }

  openEdit(activity: SalesActivity): void {
    this.form = {
      id: activity.id,
      customerId: activity.customerId,
      activityType: activity.activityType,
      subject: activity.subject,
      notes: activity.notes ?? '',
      activityDate: this.toLocalInput(activity.activityDate),
      nextFollowUpDate: this.toLocalInput(activity.nextFollowUpDate),
    };
    this.formOpen = true;
  }

  closeForm(): void {
    if (!this.saving()) this.formOpen = false;
  }

  saveActivity(): void {
    if (!this.form.customerId || !this.form.activityType || !this.form.subject.trim() || !this.form.activityDate) {
      this.toast.show('Customer, activity type, subject and activity date are required.');
      return;
    }
    if (
      !this.form.id &&
      !this.eligibleCustomers().some((customer) => customer.id === Number(this.form.customerId))
    ) {
      this.toast.show(
        `You can only add ${this.kind} activities to customers with ${this.kind} status.`,
      );
      return;
    }

    const basePayload: UpdateSalesActivityPayload = {
      activityType: Number(this.form.activityType),
      subject: this.form.subject.trim(),
      activityDate: new Date(this.form.activityDate).toISOString(),
    };
    if (this.form.notes.trim()) basePayload.notes = this.form.notes.trim();
    if (this.form.nextFollowUpDate) {
      basePayload.nextFollowUpDate = new Date(this.form.nextFollowUpDate).toISOString();
    }

    const id = this.form.id;
    const request = id
      ? this.service.update(this.kind, id, basePayload)
      : this.service.create(this.kind, {
          ...basePayload,
          customerId: Number(this.form.customerId),
        } as CreateSalesActivityPayload);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen = false;
        this.toast.show(`Activity ${id ? 'updated' : 'created'} successfully.`);
        this.loadActivities();
      },
      error: (error) => {
        this.saving.set(false);
        this.toast.show(error.error?.message || 'Failed to save activity.');
      },
    });
  }

  confirmDelete(): void {
    const activity = this.deleteTarget;
    if (!activity) return;
    this.saving.set(true);
    this.service.delete(this.kind, activity.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.deleteTarget = null;
        this.toast.show('Activity deleted successfully.');
        this.loadActivities();
      },
      error: (error) => {
        this.saving.set(false);
        this.toast.show(error.error?.message || 'Failed to delete activity.');
      },
    });
  }

  private emptyForm(): ActivityForm {
    return {
      id: null,
      customerId: 0,
      activityType: SalesActivityType.Call,
      subject: '',
      notes: '',
      activityDate: this.toLocalInput(new Date().toISOString()),
      nextFollowUpDate: '',
    };
  }

  private toLocalInput(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
}
