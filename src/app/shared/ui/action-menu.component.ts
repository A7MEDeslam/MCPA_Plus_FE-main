import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

/**
 * "..." button with a dropdown. Project buttons with class `ui-menu-item`:
 *
 *   <app-action-menu label="More actions">
 *     <button type="button" class="ui-menu-item" role="menuitem" (click)="edit()">
 *       <i class="pi pi-pencil"></i> Edit
 *     </button>
 *     <hr class="ui-menu-sep" />
 *     <button type="button" class="ui-menu-item ui-menu-item--danger" role="menuitem" (click)="remove()">
 *       <i class="pi pi-trash"></i> Delete
 *     </button>
 *   </app-action-menu>
 *
 * Closes on item click, outside click and Esc (focus goes back to the trigger).
 */
@Component({
  selector: 'app-action-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close(true)',
  },
  template: `
    <button
      #trigger
      type="button"
      class="ui-btn ui-btn--ghost ui-btn--icon"
      aria-haspopup="menu"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="label()"
      [title]="label()"
      (click)="open.set(!open())"
    >
      <i class="pi pi-ellipsis-h" aria-hidden="true"></i>
    </button>
    @if (open()) {
      <div class="menu" role="menu" (click)="close()"><ng-content /></div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: inline-block;
    }
    .menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      z-index: 30;
      min-width: 200px;
      padding: 0.25rem;
      border: 1px solid var(--ui-border);
      border-radius: var(--ui-radius-md);
      background: var(--ui-surface);
      box-shadow: 0 10px 30px -8px rgb(15 35 50 / 0.25);
      animation: pop var(--ui-dur) var(--ui-ease-out);
    }
    @keyframes pop {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
  `,
})
export class ActionMenuComponent {
  readonly label = input('More actions');
  protected readonly open = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  protected close(returnFocus = false): void {
    if (!this.open()) return;
    this.open.set(false);
    if (returnFocus) this.trigger().nativeElement.focus();
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.contains(event.target as Node)) this.open.set(false);
  }
}
