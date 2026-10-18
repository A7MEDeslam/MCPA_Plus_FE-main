import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  GoodsReceiptsReportService,
  GoodsReceiptReportRow,
} from '../../services/goods-receipts-report.service';
import { GoodsReceiptService, GoodsReceiptDetail } from '../../services/goods-receipt.service';

@Component({
  selector: 'app-goods-receipts-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './goods-receipts-report.component.html',
  styleUrl: './goods-receipts-report.component.css',
})
export class GoodsReceiptsReportComponent implements OnInit {
  private reportService = inject(GoodsReceiptsReportService);
  private goodsReceiptService = inject(GoodsReceiptService);

  rows = signal<GoodsReceiptReportRow[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  from: string | null = null;
  to: string | null = null;

  selectedRow = signal<GoodsReceiptReportRow | null>(null);

  detailRow = signal<GoodsReceiptDetail | null>(null);
  detailLoading = signal(false);
  detailError = signal<string | null>(null);

  totalReceipts = computed(() => this.rows().length);
  totalQty = computed(() => this.rows().reduce((sum, r) => sum + (r.totalReceivedQty || 0), 0));
  postedCount = computed(() => this.rows().filter((r) => r.hasJournalEntry).length);
  unpostedCount = computed(() => this.rows().filter((r) => !r.hasJournalEntry).length);

  ngOnInit(): void {
    this.fetchReport();
  }

  fetchReport(): void {
    this.loading.set(true);
    this.error.set(null);

    this.reportService.getReport({ from: this.from, to: this.to }).subscribe({
      next: (data) => {
        this.rows.set(data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load report. Please try again.');
        this.loading.set(false);
      },
    });
  }

  clearFilters(): void {
    this.from = null;
    this.to = null;
    this.fetchReport();
  }

  openJournalEntry(row: GoodsReceiptReportRow): void {
    if (!row.hasJournalEntry) return;
    this.selectedRow.set(row);
  }

  closeJournalEntry(): void {
    this.selectedRow.set(null);
  }

  openDetails(row: GoodsReceiptReportRow): void {
    this.detailError.set(null);
    this.detailLoading.set(true);
    this.detailRow.set(null);

    this.goodsReceiptService.getById(row.id).subscribe({
      next: (data) => {
        this.detailRow.set(data);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailError.set('Failed to load receipt details.');
        this.detailLoading.set(false);
      },
    });
  }

  closeDetails(): void {
    this.detailRow.set(null);
    this.detailError.set(null);
  }
}
