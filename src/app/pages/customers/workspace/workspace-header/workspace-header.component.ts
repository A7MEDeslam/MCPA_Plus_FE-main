import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Customer } from '../../../../models/customer.models';
import { ActionMenuComponent, BadgeComponent, StageTrackComponent } from '../../../../shared/ui';
import { CUSTOMER_STAGES, initialsOf, stageIndexOf, stageOf } from '../customer-status';

/**
 * Identity + actions + stage progress + pending-approval banner.
 *
 *   <app-workspace-header
 *     [customer]="customer"
 *     [canManage]="canManage"
 *     [canRequestUpgrade]="canRequestStageChange && !hasPendingRequest() && allowedNextStatuses().length > 0"
 *     [nextStageLabel]="nextStageLabel()"
 *     [pendingFrom]="pendingRequest()?.fromStatusName ?? null"
 *     [pendingTo]="pendingRequest()?.toStatusName ?? null"
 *     (requestUpgrade)="openRequestUpgrade()"
 *     (assign)="openAssign(customer)"
 *     (edit)="openEdit(customer)"
 *     (activities)="openActivities(customer)"
 *     (remove)="deleteCustomer(customer)" />
 */
@Component({
  selector: 'app-workspace-header',
  imports: [ActionMenuComponent, BadgeComponent, StageTrackComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-header.component.html',
  styleUrl: './workspace-header.component.css',
})
export class WorkspaceHeaderComponent {
  readonly customer = input.required<Customer>();
  readonly canManage = input(false);
  readonly canRequestUpgrade = input(false);
  readonly nextStageLabel = input<string | null>(null);
  readonly pendingFrom = input<string | null | undefined>(null);
  readonly pendingTo = input<string | null | undefined>(null);

  readonly requestUpgrade = output<void>();
  readonly assign = output<void>();
  readonly edit = output<void>();
  readonly activities = output<void>();
  readonly remove = output<void>();

  protected readonly steps = CUSTOMER_STAGES;

  protected readonly initials = computed(() => initialsOf(this.customer().companyName));
  protected readonly stage = computed(() => stageOf(this.customer().status));
  protected readonly stageIndex = computed(() => stageIndexOf(this.customer().status));

  protected readonly place = computed(() => {
    const { region, country } = this.customer();
    return [region, country].filter(Boolean).join(', ');
  });

  /** `location` holds a map link, so show the region as text and link it to the map. */
  protected readonly mapUrl = computed(() => {
    const location = this.customer().location?.trim() ?? '';
    return /^https?:\/\//i.test(location) ? location : null;
  });
}
