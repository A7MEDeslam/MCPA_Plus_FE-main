import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MobileNavService {
  readonly open = signal(false);

  toggle(): void {
    this.open.update(open => !open);
  }

  close(): void {
    this.open.set(false);
  }
}
