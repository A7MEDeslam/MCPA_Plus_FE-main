import { Injectable, signal } from '@angular/core';

/** Tracks requests that change data (POST, PUT, PATCH and DELETE). */
@Injectable({ providedIn: 'root' })
export class ApiRequestStateService {
  private readonly pendingMutations = signal(0);
  readonly mutationCount = this.pendingMutations.asReadonly();

  beginMutation(): void {
    this.pendingMutations.update(count => count + 1);
  }

  endMutation(): void {
    this.pendingMutations.update(count => Math.max(0, count - 1));
  }
}
