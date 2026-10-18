import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
} from '@angular/core';

export interface TrackStep {
  label: string;
}

/**
 * One stepper for all three places that used to copy-paste it
 * (customer stages, contract approval, sub-contract approval).
 *
 * `current` is a 0-based index. Steps before it are done, it is highlighted,
 * the rest are pending.
 *
 *   <app-stage-track [steps]="customerStatuses" [current]="customer.status - 1" />
 *   <app-stage-track [steps]="contractSteps" [current]="contractStepIndex(contract.statusName)"
 *                    ariaLabel="Contract approval progress" />
 *
 * On narrow screens it scrolls sideways and keeps the current step in view.
 */
@Component({
  selector: 'app-stage-track',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="track" [style.--steps]="steps().length" [attr.aria-label]="ariaLabel()">
      @for (step of steps(); track step.label; let i = $index) {
        <li
          class="step"
          [attr.data-state]="i < current() ? 'done' : i === current() ? 'current' : 'todo'"
          [attr.aria-current]="i === current() ? 'step' : null"
        >
          <span class="dot">
            @if (i < current()) {
              <i class="pi pi-check" aria-hidden="true"></i>
            } @else {
              {{ i + 1 }}
            }
          </span>
          <span class="label">{{ step.label }}</span>
        </li>
      }
    </ol>
  `,
  styles: `
    :host {
      display: block;
      overflow-x: auto;
      padding: 0.25rem 0 0.5rem;
      scrollbar-width: thin;
    }
    .track {
      display: grid;
      grid-template-columns: repeat(var(--steps), minmax(76px, 1fr));
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .step {
      position: relative;
      display: grid;
      justify-items: center;
      gap: 0.5rem;
      color: var(--ui-text-subtle);
      font-size: 0.6875rem;
      text-align: center;
    }
    /* connector from the previous dot to this one */
    .step:not(:first-child)::before {
      content: '';
      position: absolute;
      top: 13px;
      right: calc(50% + 14px);
      left: calc(-50% + 14px);
      height: 2px;
      background: var(--ui-border);
    }
    .step[data-state='done']::before,
    .step[data-state='current']::before {
      background: var(--ui-primary);
    }
    .dot {
      position: relative;
      z-index: 1;
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border: 2px solid var(--ui-border-strong);
      border-radius: 50%;
      background: var(--ui-surface);
      font-size: 0.72rem;
      font-weight: 700;
    }
    .step[data-state='done'] .dot {
      border-color: var(--ui-primary);
      background: var(--ui-primary);
      color: #fff;
    }
    .step[data-state='current'] .dot {
      border-color: var(--ui-primary);
      color: var(--ui-primary);
      box-shadow: 0 0 0 4px var(--ui-primary-bg);
    }
    .label {
      padding-inline: 0.25rem;
      font-weight: 500;
      line-height: 1.25;
    }
    .step[data-state='done'] .label {
      color: var(--ui-text-muted);
    }
    .step[data-state='current'] .label {
      color: var(--ui-text);
      font-weight: 700;
    }
  `,
})
export class StageTrackComponent {
  readonly steps = input.required<readonly TrackStep[]>();
  readonly current = input.required<number>();
  readonly ariaLabel = input('Progress');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    // Keep the current step visible when the track scrolls (phones).
    afterRenderEffect(() => {
      this.current();
      const host = this.host;
      if (host.scrollWidth <= host.clientWidth) return;
      const el = host.querySelector<HTMLElement>('[aria-current="step"]');
      if (!el) return;
      host.scrollLeft = el.offsetLeft - host.clientWidth / 2 + el.clientWidth / 2;
    });
  }
}
