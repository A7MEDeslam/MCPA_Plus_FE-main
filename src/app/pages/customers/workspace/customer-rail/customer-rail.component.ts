import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';

import { Customer } from '../../../../models/customer.models';
import { BadgeComponent, EmptyStateComponent } from '../../../../shared/ui';
import {
  CUSTOMER_STAGES,
  CustomerStage,
  initialsOf,
  stageIndexOf,
  stageOf,
  StageGroup,
} from '../customer-status';

type RailFilter = 'all' | StageGroup;

interface RailRow {
  customer: Customer;
  stage: CustomerStage;
  index: number;
  initials: string;
  place: string;
}

/**
 * Left rail: search, stage filters and the customer list.
 *
 *   <app-customer-rail
 *     [customers]="filteredCustomers()"
 *     [activeId]="activeCustomer()?.id ?? null"
 *     [loading]="loading()"
 *     [canManage]="canManage"
 *     [(search)]="search"
 *     (selected)="selectCustomer($event)"
 *     (create)="openCreate()"
 *     (manageIndustries)="openIndustries()" />
 */
@Component({
  selector: 'app-customer-rail',
  imports: [BadgeComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-rail.component.html',
  styleUrl: './customer-rail.component.css',
})
export class CustomerRailComponent {
  /** Already search-filtered list from the parent. */
  readonly customers = input.required<readonly Customer[]>();
  readonly activeId = input<number | null>(null);
  readonly loading = input(false);
  readonly canManage = input(false);
  readonly search = model('');

  readonly selected = output<Customer>();
  readonly create = output<void>();
  readonly manageIndustries = output<void>();

  protected readonly filter = signal<RailFilter>('all');
  protected readonly skeletons = [0, 1, 2, 3, 4];
  protected readonly segments = CUSTOMER_STAGES.map((_, index) => index);

  protected readonly chips = computed(() => {
    const list = this.customers();
    const count = (group: StageGroup) =>
      list.filter((customer) => stageOf(customer.status).group === group).length;
    return [
      { id: 'all' as const, label: 'All', count: list.length },
      { id: 'prospect' as const, label: 'Prospects', count: count('prospect') },
      { id: 'deal' as const, label: 'In deal', count: count('deal') },
      { id: 'won' as const, label: 'Contracted', count: count('won') },
    ];
  });

  protected readonly rows = computed<RailRow[]>(() => {
    const filter = this.filter();
    return this.customers()
      .filter((customer) => filter === 'all' || stageOf(customer.status).group === filter)
      .map((customer) => ({
        customer,
        stage: stageOf(customer.status),
        index: stageIndexOf(customer.status),
        initials: initialsOf(customer.companyName),
        place: customer.region || customer.country || '',
      }));
  });

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }
}
