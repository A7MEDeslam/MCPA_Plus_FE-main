import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ModalComponent } from './modal.component';

/**
 * One confirm dialog for every "are you sure?" in the app
 * (delete customer / contact / activity / industry, confirm conversion, ...).
 *
 *   @if (deleteTarget(); as target) {
 *     <app-confirm-dialog
 *       title="Delete contact"
 *       message="You are about to delete"
 *       [subject]="target.name"
 *       detail="This action cannot be undone."
 *       confirmLabel="Delete"
 *       [busy]="saving()"
 *       (confirmed)="confirmDelete()"
 *       (cancelled)="deleteTarget.set(null)"
 *     />
 *   }
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [title]="title()" size="sm" [busy]="busy()" (closed)="cancelled.emit()">
      <div class="content">
        <span class="icon" [attr.data-tone]="tone()">
          <i [class]="'pi ' + resolvedIcon()" aria-hidden="true"></i>
        </span>
        <div class="text">
          @if (message()) {
            <p class="message">{{ message() }}</p>
          }
          @if (subject()) {
            <strong class="subject">{{ subject() }}</strong>
          }
          @if (detail()) {
            <p class="message">{{ detail() }}</p>
          }
        </div>
      </div>

      <div modal-footer class="actions">
        <button
          type="button"
          class="ui-btn ui-btn--ghost"
          autofocus
          [disabled]="busy()"
          (click)="cancelled.emit()"
        >
          {{ cancelLabel() }}
        </button>
        <button
          type="button"
          class="ui-btn"
          [class.ui-btn--danger]="tone() === 'danger'"
          [class.ui-btn--primary]="tone() !== 'danger'"
          [disabled]="busy()"
          (click)="confirmed.emit()"
        >
          <i [class]="busy() ? 'pi pi-spin pi-spinner' : 'pi ' + resolvedConfirmIcon()"></i>
          {{ confirmLabel() }}
        </button>
      </div>
    </app-modal>
  `,
  styles: `
    .content {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }
    .icon {
      display: grid;
      flex: none;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      font-size: 1.15rem;
    }
    .icon[data-tone='danger'] {
      background: var(--ui-danger-bg);
      color: var(--ui-danger-fg);
    }
    .icon[data-tone='warning'] {
      background: var(--ui-warning-bg);
      color: var(--ui-warning-fg);
    }
    .text {
      min-width: 0;
    }
    .message {
      margin: 0;
      color: var(--ui-text-muted);
      font-size: var(--ui-text-base);
      line-height: 1.5;
    }
    .subject {
      display: block;
      margin: 0.25rem 0;
      color: var(--ui-text);
      font-size: var(--ui-text-md);
      overflow-wrap: anywhere;
    }
    .actions {
      display: contents;
    }
  `,
})
export class ConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly message = input<string>();
  /** The thing being acted on, shown in bold (customer name, contact name, ...). */
  readonly subject = input<string>();
  readonly detail = input<string>();
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  readonly tone = input<'danger' | 'warning'>('danger');
  readonly icon = input<string>();
  readonly confirmIcon = input<string>();
  readonly busy = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly resolvedIcon = computed(
    () => this.icon() ?? (this.tone() === 'danger' ? 'pi-trash' : 'pi-exclamation-triangle'),
  );
  protected readonly resolvedConfirmIcon = computed(
    () => this.confirmIcon() ?? (this.tone() === 'danger' ? 'pi-trash' : 'pi-check'),
  );
}
