import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Customer } from '../../../../models/customer.models';
import { StageChangeRequest } from '../../../../models/customer-stage-change-request.dto';
import { CustomerStageDetails } from '../../../../models/customer-stage-details.dto';
import { BadgeComponent, EmptyStateComponent } from '../../../../shared/ui';
import { stageOf } from '../customer-status';
import { buildStageSummary, formatDate, suggestedFocus } from '../overview-summary';

/**
 * Overview tab: stage summary, account details, pending approval, suggested focus.
 *
 *   @if (workspaceTab === 'overview') {
 *     <app-overview-tab
 *       [customer]="customer"
 *       [details]="stageDetails()"
 *       [loading]="stageDetailsLoading()"
 *       [pending]="pendingRequest()"
 *       [isCeo]="isCEO"
 *       [busy]="savingStageAction()"
 *       (approve)="confirmApproveRequest()"
 *       (reject)="openRejectRequest()"
 *       (edit)="openEdit(customer)" />
 *   }
 */
@Component({
  selector: 'app-overview-tab',
  imports: [BadgeComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './overview-tab.component.html',
  styleUrl: './overview-tab.component.css',
})
export class OverviewTabComponent {
  readonly customer = input.required<Customer>();
  readonly details = input<CustomerStageDetails | null>(null);
  readonly loading = input(false);
  readonly pending = input<StageChangeRequest | null>(null);
  readonly isCeo = input(false);
  readonly busy = input(false);
  readonly canReview = input(false);
  readonly approve = output<void>();
  readonly reject = output<void>();
  readonly edit = output<void>();

  protected readonly formatDate = formatDate;

  protected readonly stage = computed(() => stageOf(this.customer().status));
  protected readonly summary = computed(() => buildStageSummary(this.customer(), this.details()));
  protected readonly focus = computed(() =>
    suggestedFocus(this.customer().status, this.pending() !== null),
  );
  protected readonly location = computed(() => {
    const { city, country, region } = this.customer();
    return [city, country, region].filter(Boolean).join(', ') || '-';
  });
}
