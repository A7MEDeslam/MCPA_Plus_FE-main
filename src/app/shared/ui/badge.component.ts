import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type Tone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'violet'
  | 'orange';

/**
 * Replaces .customer-status, .healthy-badge, .poc-status-badge, .role-chip,
 * .contact-primary-badge and the badge-* classes: one component, tone-driven.
 *
 *   <app-badge tone="success">Healthy</app-badge>
 *   <app-badge tone="danger" size="sm"><i class="pi pi-ban"></i> Rejected</app-badge>
 */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.color]': 'fg()',
    '[style.background-color]': 'bg()',
    '[attr.data-size]': 'size()',
  },
  template: `<ng-content />`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      max-width: 100%;
      padding: 0.25rem 0.625rem;
      overflow: hidden;
      border-radius: var(--ui-radius-pill);
      font: 700 var(--ui-text-xs) / 1.2 var(--ui-font);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    :host([data-size='sm']) {
      padding: 0.125rem 0.5rem;
      font-size: 0.6875rem;
    }
  `,
})
export class BadgeComponent {
  readonly tone = input<Tone>('neutral');
  readonly size = input<'sm' | 'md'>('md');

  protected readonly fg = computed(() => `var(--ui-${this.tone()}-fg)`);
  protected readonly bg = computed(() => `var(--ui-${this.tone()}-bg)`);
}