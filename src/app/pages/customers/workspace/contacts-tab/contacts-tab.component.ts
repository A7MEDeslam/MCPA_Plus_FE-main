import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { environment } from '../../../../../environments/environment';
import { CustomerContact } from '../../../../models/customer.models';
import { BadgeComponent, EmptyStateComponent, type Tone } from '../../../../shared/ui';
import { initialsOf } from '../customer-status';
import { formatDate } from '../overview-summary';

interface ContactRow {
  contact: CustomerContact;
  initials: string;
  subtitle: string;
  role: string;
  roleTone: Tone;
  influence: string;
  /** 0-3 filled bars. */
  influenceRank: number;
  cardUrl: string | null;
  cardName: string;
  added: string;
}

const normalize = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/g, '').toLowerCase();

/** "DecisionMaker" -> "Decision Maker" */
const humanize = (value: string | null | undefined): string =>
  (value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2');

function roleTone(role: string): Tone {
  switch (normalize(role)) {
    case 'decisionmaker':
      return 'primary';
    case 'champion':
      return 'success';
    case 'influencer':
      return 'info';
    case 'gatekeeper':
      return 'warning';
    case 'technicalevaluator':
      return 'violet';
    case 'procurement':
      return 'orange';
    default:
      return 'neutral';
  }
}

function influenceRank(name: string | null | undefined): number {
  switch (normalize(name)) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

/**
 * Contacts tab: relationship coverage, contact cards, business cards.
 *
 *   @if (workspaceTab === 'contacts') {
 *     <app-contacts-tab
 *       [contacts]="workspaceContacts()"
 *       [loading]="workspaceContactsLoading()"
 *       [canManage]="canManage"
 *       (add)="openWorkspaceAddContact(customer)"
 *       (details)="openContactDetails($event)"
 *       (edit)="openEditContact($event)"
 *       (remove)="deleteContact($event)"
 *       (togglePrimary)="toggleWorkspacePrimary($event)"
 *       (uploadCard)="uploadBusinessCard($event.contact, $event.file)" />
 *   }
 */
@Component({
  selector: 'app-contacts-tab',
  imports: [BadgeComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts-tab.component.html',
  styleUrl: './contacts-tab.component.css',
})
export class ContactsTabComponent {
  readonly contacts = input.required<readonly CustomerContact[]>();
  readonly loading = input(false);
  readonly canManage = input(false);

  readonly add = output<void>();
  readonly details = output<CustomerContact>();
  readonly edit = output<CustomerContact>();
  readonly remove = output<CustomerContact>();
  readonly togglePrimary = output<CustomerContact>();
  readonly uploadCard = output<{ contact: CustomerContact; file: File }>();

  protected readonly skeletons = [0, 1, 2];
  protected readonly bars = [0, 1, 2];

  protected readonly hasPrimary = computed(() => this.contacts().some((c) => c.isPrimary));

  protected readonly coverage = computed(() => {
    const list = this.contacts();
    const roles = new Set(list.map((c) => normalize(c.dealRoleName)));
    return [
      { label: 'Primary contact', ok: list.some((c) => c.isPrimary) },
      { label: 'Decision maker', ok: roles.has('decisionmaker') },
      { label: 'Champion', ok: roles.has('champion') },
    ];
  });

  /** Primary first, then highest influence, then name. */
  protected readonly rows = computed<ContactRow[]>(() => {
    const base = environment.apiUrl.replace(/\/api\/?$/, '');
    return this.contacts()
      .map((contact) => {
        const role = humanize(contact.dealRoleName) || 'Contact';
        const file = contact.businessCardUrl;
        return {
          contact,
          initials: initialsOf(contact.name),
          subtitle:
            [contact.jobTitle, contact.department].filter(Boolean).join(', ') || 'Customer contact',
          role,
          roleTone: roleTone(role),
          influence: contact.influenceName || 'Not set',
          influenceRank: influenceRank(contact.influenceName),
          cardUrl: file ? `${base}${file}` : null,
          cardName: file ? decodeURIComponent(file.split('/').pop() ?? 'business-card') : '',
          added: formatDate(contact.createdAt),
        };
      })
      .sort(
        (a, b) =>
          Number(b.contact.isPrimary) - Number(a.contact.isPrimary) ||
          b.influenceRank - a.influenceRank ||
          a.contact.name.localeCompare(b.contact.name),
      );
  });

  protected onFile(contact: CustomerContact, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow picking the same file again
    if (file) this.uploadCard.emit({ contact, file });
  }
}
