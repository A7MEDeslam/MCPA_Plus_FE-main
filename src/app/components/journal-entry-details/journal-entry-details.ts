import { JOURNAL_STATUS_CLASS, JOURNAL_STATUS_LABELS } from './../../models/journal-entry.dto';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { JournalEntry, JournalStatus } from '../../models/journal-entry.dto';
import { PdfExport } from '../../services/pdf-export';

@Component({
  selector: 'app-journal-entry-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './journal-entry-details.html',
  styleUrls: ['./journal-entry-details.css'],
})
export class JournalEntryDetailsComponent {
  @Input() entry!: JournalEntry;
  @Output() close = new EventEmitter<void>();

  private pdfExportService = inject(PdfExport);

  @ViewChild('printSection') printSection?: ElementRef<HTMLElement>;

  exportingPdf = false;

  statusLabels = JOURNAL_STATUS_LABELS;

  statusClasses = JOURNAL_STATUS_CLASS;

  get totalDebit() {
    return this.entry.lines.reduce((a: number, b: any) => a + b.debit, 0);
  }

  get totalCredit() {
    return this.entry.lines.reduce((a: number, b: any) => a + b.credit, 0);
  }

  exportPdf(): void {
    if (!this.printSection || this.exportingPdf) return;

    const element = this.printSection.nativeElement;
    const noPrintEls = element.querySelectorAll<HTMLElement>('.no-print');
    noPrintEls.forEach((el) => (el.style.display = 'none'));

    this.exportingPdf = true;
    const filename = `Journal-${this.entry?.entryNumber ?? 'entry'}`;

    this.pdfExportService
      .export(element, filename)
      .then(() => {
        this.exportingPdf = false;
        noPrintEls.forEach((el) => (el.style.display = ''));
      })
      .catch(() => {
        this.exportingPdf = false;
        noPrintEls.forEach((el) => (el.style.display = ''));
      });
  }
}
