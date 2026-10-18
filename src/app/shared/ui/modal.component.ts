import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

export type ModalSize = 'sm' | 'md' | 'lg';

let nextModalId = 0;

/**
 * Modal on top of the native <dialog>: focus trap, Esc, top-layer stacking
 * (so a modal opened from another modal just works) and backdrop come free.
 *
 * Usage: render it with @if, it opens itself on creation.
 *
 *   @if (formOpen()) {
 *     <app-modal title="Edit customer" size="lg" [busy]="saving()" (closed)="closeForm()">
 *       ...body...
 *       <button modal-footer class="ui-btn ui-btn--primary">Save</button>
 *     </app-modal>
 *   }
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="modal ui-modal"
      [attr.data-size]="size()"
      [attr.aria-labelledby]="titleId"
      (cancel)="onCancel($event)"
      (pointerdown)="onPointerDown($event)"
      (click)="onClick($event)"
    >
      <div class="panel">
        <header class="head">
          <div>
            <h2 class="title" [id]="titleId">{{ title() }}</h2>
            @if (subtitle()) {
              <p class="subtitle">{{ subtitle() }}</p>
            }
          </div>
          <button
            type="button"
            class="close"
            aria-label="Close"
            [disabled]="busy()"
            (click)="requestClose()"
          >
            <i class="pi pi-times" aria-hidden="true"></i>
          </button>
        </header>
        <div class="body"><ng-content /></div>
        <footer class="footer"><ng-content select="[modal-footer]" /></footer>
      </div>
    </dialog>
  `,
  styles: `
    :host {
      display: contents;
    }
    .modal {
      --w: 600px;
      width: min(var(--w), calc(100vw - 2rem));
      max-width: none;
      max-height: calc(100dvh - 2rem);
      padding: 0;
      overflow: hidden;
      border: 1px solid var(--ui-border);
      border-radius: var(--ui-radius-lg);
      background: var(--ui-surface);
      color: var(--ui-text);
      font-family: var(--ui-font);
      box-shadow: var(--ui-shadow-pop);
      margin: auto;
    }
    .modal[data-size='sm'] {
      --w: 440px;
    }
    .modal[data-size='lg'] {
      --w: 820px;
    }
    .modal[open] {
      display: flex;
      animation: rise var(--ui-dur-slow) var(--ui-ease-out);
    }
    .modal::backdrop {
      background: rgb(15 27 39 / 0.5);
      backdrop-filter: blur(2px);
    }
    .panel {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }
    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.125rem 1.375rem;
      border-bottom: 1px solid var(--ui-border);
    }
    .title {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 700;
      line-height: 1.3;
      letter-spacing: -0.01em;
    }
    .subtitle {
      margin: 0.125rem 0 0;
      color: var(--ui-text-muted);
      font-size: var(--ui-text-sm);
    }
    .close {
      display: grid;
      flex: none;
      place-items: center;
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: var(--ui-radius-sm);
      background: transparent;
      color: var(--ui-text-subtle);
      cursor: pointer;
      transition:
        background-color var(--ui-dur) var(--ui-ease),
        color var(--ui-dur) var(--ui-ease);
    }
    .close:hover:not(:disabled) {
      background: var(--ui-surface-muted);
      color: var(--ui-text);
    }
    .close:focus-visible {
      outline: none;
      box-shadow: var(--ui-focus);
    }
    .close:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .body {
      flex: 1;
      min-height: 0;
      padding: 1.375rem;
      overflow-y: auto;
    }
    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 0.875rem 1.375rem;
      border-top: 1px solid var(--ui-border);
      background: var(--ui-surface-muted);
    }
    .footer:empty {
      display: none;
    }
    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
    /* Phones: bottom sheet */
    @media (max-width: 560px) {
      .modal {
        width: 100%;
        max-height: calc(100dvh - 1rem);
        margin: auto 0 0;
        border-radius: var(--ui-radius-lg) var(--ui-radius-lg) 0 0;
      }
    }
  `,
})
export class ModalComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly size = input<ModalSize>('md');
  /** While true the modal cannot be dismissed (Esc, backdrop and X are ignored). */
  readonly busy = input(false);
  readonly closed = output<void>();

  protected readonly titleId = `app-modal-title-${nextModalId++}`;

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private pressedOnBackdrop = false;

  constructor() {
    const opener = inject(DOCUMENT).activeElement as HTMLElement | null;

    // The dialog element is removed with the component, so give focus back by hand.
    inject(DestroyRef).onDestroy(() => {
      if (opener?.isConnected) opener.focus();
    });

    afterNextRender(() => {
      const dlg = this.dialog().nativeElement;
      dlg.showModal();
      // A button with [autofocus] wins (the native dialog handles it).
      // Otherwise focus the first field instead of the X button.
      if (!dlg.querySelector('[autofocus]')) {
        dlg
          .querySelector<HTMLElement>(
            '.body :is(input:not([type=hidden]), select, textarea):not([disabled])',
          )
          ?.focus();
      }
    });
  }

  protected requestClose(): void {
    if (!this.busy()) this.closed.emit();
  }

  protected onCancel(event: Event): void {
    // Esc: let the parent decide, never let the browser close the element itself.
    event.preventDefault();
    this.requestClose();
  }

  // Close on backdrop click only if the press also started on the backdrop,
  // so dragging a text selection out of an input doesn't dismiss the modal.
  protected onPointerDown(event: PointerEvent): void {
    this.pressedOnBackdrop = event.target === this.dialog().nativeElement;
  }

  protected onClick(event: MouseEvent): void {
    if (this.pressedOnBackdrop && event.target === this.dialog().nativeElement) {
      this.requestClose();
    }
    this.pressedOnBackdrop = false;
  }
}