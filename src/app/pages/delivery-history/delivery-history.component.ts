import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SerialHistory, SerialHistoryEntry } from '../../models/serial-history.dto';
import { SerialHistoryService } from '../../services/serial-history.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-delivery-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delivery-history.component.html',
  styleUrl: './delivery-history.component.css',
})
export class DeliveryHistoryComponent implements OnInit {
  private readonly historyService = inject(SerialHistoryService);
  private readonly toast = inject(ToastService);

  readonly entries = signal<SerialHistoryEntry[]>([]);
  readonly loading = signal(false);
  readonly search = signal('');
  readonly actionFilter = signal('');

  readonly selectedSerial = signal<SerialHistory | null>(null);
  readonly serialLoading = signal(false);
  readonly serialOpen = signal(false);

  readonly actionTypes = computed(() =>
    [...new Set(this.entries().map((e) => e.actionTypeName))].sort(),
  );

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const action = this.actionFilter();

    return this.entries()
      .filter((e) => !action || e.actionTypeName === action)
      .filter(
        (e) =>
          !term ||
          [e.serial, e.finishedProductName, e.deliveryRequestNumber, e.actionByName, e.notes]
            .join(' ')
            .toLowerCase()
            .includes(term),
      )
      .sort((a, b) => new Date(b.actionAt).getTime() - new Date(a.actionAt).getTime());
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.historyService.getAll().subscribe({
      next: (data) => {
        this.entries.set(Array.isArray(data) ? data : []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load history:', error);
        this.loading.set(false);
        this.toast.show(error.error?.message || 'Failed to load history.');
      },
    });
  }

  openSerial(serialId: number): void {
    this.serialOpen.set(true);
    this.serialLoading.set(true);
    this.selectedSerial.set(null);
    this.historyService.getBySerial(serialId).subscribe({
      next: (data) => {
        const sorted = {
          ...data,
          history: [...(data.history ?? [])].sort(
            (a, b) => new Date(b.actionAt).getTime() - new Date(a.actionAt).getTime(),
          ),
        };
        this.selectedSerial.set(sorted);
        this.serialLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load serial history:', error);
        this.serialLoading.set(false);
        this.serialOpen.set(false);
        this.toast.show(error.error?.message || 'Failed to load serial history.');
      },
    });
  }

  closeSerial(): void {
    this.serialOpen.set(false);
    this.selectedSerial.set(null);
  }
}
