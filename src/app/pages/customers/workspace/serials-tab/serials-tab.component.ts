import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';

import type { CustomerSerial } from '../../../../models/customer-serial.dto';
import type { Customer } from '../../../../models/customer.models';
import { CustomerService } from '../../../../services/customer.service';

@Component({
  selector: 'app-customer-serials-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './serials-tab.component.html',
  styleUrl: './serials-tab.component.css',
})
export class SerialsTabComponent {
  readonly customer = input.required<Customer>();
  readonly serials = signal<CustomerSerial[]>([]);
  readonly loading = signal(false);
  readonly hasError = signal(false);

  private readonly customerService = inject(CustomerService);
  private requestId = 0;

  constructor() {
    effect(() => this.load(this.customer().id));
  }

  retry(): void {
    this.load(this.customer().id);
  }

  private load(customerId: number): void {
    const requestId = ++this.requestId;
    this.serials.set([]);
    this.hasError.set(false);
    this.loading.set(true);

    this.customerService.getSerials(customerId).subscribe({
      next: (serials) => {
        if (requestId !== this.requestId) return;
        this.serials.set(Array.isArray(serials) ? serials : []);
        this.loading.set(false);
      },
      error: (error) => {
        if (requestId !== this.requestId) return;
        console.error('Failed to load customer serials:', error);
        this.serials.set([]);
        this.loading.set(false);
        this.hasError.set(true);
      },
    });
  }
}
