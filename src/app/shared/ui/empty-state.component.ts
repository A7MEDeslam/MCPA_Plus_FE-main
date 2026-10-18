import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Replaces .table-state, .contacts-state, .rail-state and .empty-workspace.
 * Say what is missing and what to do about it; project an action if there is one.
 *
 *   <app-empty-state icon="pi-address-book" title="No contacts yet"
 *                    message="Add the people who influence this account.">
 *     <button class="ui-btn ui-btn--primary" (click)="add()">Add first contact</button>
 *   </app-empty-state>
 *
 *   <app-empty-state variant="inline" title="No items added yet." />
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-variant]': 'variant()' },
  template: `
    @if (variant() === 'block') {
      <i [class]="'pi icon ' + icon()" aria-hidden="true"></i>
    }
    <strong class="title">{{ title() }}</strong>
    @if (message()) {
      <span class="message">{{ message() }}</span>
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: 0.5rem;
      padding: 2.5rem 1rem;
      color: var(--ui-text-muted);
      font-size: var(--ui-text-sm);
      text-align: center;
    }
    :host([data-variant='inline']) {
      padding: 1rem;
      border: 1px dashed var(--ui-border-strong);
      border-radius: var(--ui-radius-md);
      background: var(--ui-surface-muted);
    }
    .icon {
      color: var(--ui-primary);
      font-size: 1.5rem;
    }
    .title {
      color: var(--ui-text);
      font-size: var(--ui-text-base);
    }
    :host([data-variant='inline']) .title {
      color: var(--ui-text-muted);
      font-weight: 500;
    }
    .message {
      max-width: 36ch;
      line-height: 1.5;
    }
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly icon = input('pi-inbox');
  readonly variant = input<'block' | 'inline'>('block');
}

/** Replaces every "<i class='pi pi-spin pi-spinner'></i> Loading ..." block. */
@Component({
  selector: 'app-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status' },
  template: `
    <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
    <span>{{ label() }}</span>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1.5rem 1rem;
      color: var(--ui-text-subtle);
      font-size: var(--ui-text-sm);
    }
  `,
})
export class LoadingComponent {
  readonly label = input('Loading…');
}