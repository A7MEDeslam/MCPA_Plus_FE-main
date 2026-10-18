import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { ApiRequestStateService } from './api-request-state.service';

/** Prevents duplicate clicks on create/submit buttons while a write request is running. */
@Injectable({ providedIn: 'root' })
export class CreateButtonGuardService {
  private readonly document = inject(DOCUMENT);
  private readonly requestState = inject(ApiRequestStateService);
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    this.document.addEventListener('click', event => this.handleClick(event), true);
    this.document.addEventListener('submit', event => this.handleSubmit(event), true);
  }

  private handleClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    const button = target?.closest('button, input[type="submit"]') as HTMLButtonElement | HTMLInputElement | null;
    // Native submit buttons are guarded by the submit event below. Disabling one
    // during its click event can prevent the browser from dispatching that event.
    if (!button || this.isNativeSubmitButton(button) || !this.isSubmissionButton(button)) return;
    this.lockUntilRequestSettles(button);
  }

  private handleSubmit(event: SubmitEvent): void {
    const button = event.submitter as HTMLButtonElement | HTMLInputElement | null;
    if (button && !button.disabled) this.lockUntilRequestSettles(button);
  }

  private lockUntilRequestSettles(button: HTMLButtonElement | HTMLInputElement): void {
    if (button.disabled) return;

    const mutationsBeforeClick = this.requestState.mutationCount();
    button.disabled = true;

    // Angular click handlers run after this capture listener. By the next task an
    // HttpClient write has either started, or this was only validation/modal work.
    setTimeout(() => {
      if (this.requestState.mutationCount() <= mutationsBeforeClick) {
        button.disabled = false;
        return;
      }

      const checkRequest = window.setInterval(() => {
        if (this.requestState.mutationCount() === 0) {
          button.disabled = false;
          clearInterval(checkRequest);
        }
      }, 50);
    });
  }

  private isNativeSubmitButton(button: HTMLButtonElement | HTMLInputElement): boolean {
    // A button without a type reports `submit` in the DOM, even when it is not
    // inside a form. Only actual form submitters must wait for the submit event;
    // standalone action buttons must be guarded on click.
    return button.type === 'submit' && button.form !== null;
  }

  private isSubmissionButton(button: HTMLButtonElement | HTMLInputElement): boolean {
    if (this.isNativeSubmitButton(button)) return true;

    const label = `${button.textContent ?? ''} ${button.getAttribute('aria-label') ?? ''} ${button.title ?? ''}`;
    return /\b(create|save|submit|confirm|register|assign|add|record|process|issue)\b/i.test(label);
  }
}
