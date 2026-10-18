import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  JournalEntry,
  JOURNAL_STATUS_CLASS,
  JOURNAL_STATUS_LABELS,
  JournalStatus,
} from '../../models/journal-entry.dto';

@Component({
  selector: 'app-journal-entry-table',
  imports: [CommonModule],
  templateUrl: './journal-entry-table.html',
  styleUrl: './journal-entry-table.css',
})
export class JournalEntryTable {
  @Input()
  entries: JournalEntry[] = [];

  @Output()
  view = new EventEmitter<JournalEntry>();

  @Output()
  edit = new EventEmitter<JournalEntry>();

  @Output()
  cancelEntry = new EventEmitter<JournalEntry>();

  readonly statusLabels = JOURNAL_STATUS_LABELS;
  readonly statusClasses = JOURNAL_STATUS_CLASS;
  readonly JournalStatus = JournalStatus;

  getStatusClass(status: any): string {
    return JOURNAL_STATUS_CLASS[this.normalizeStatus(status)] ?? '';
  }

  getStatusLabel(status: any): string {
    return JOURNAL_STATUS_LABELS[this.normalizeStatus(status)] ?? status;
  }

  canEdit(entry: JournalEntry): boolean {
    return this.normalizeStatus(entry.status) === JournalStatus.Posted;
  }

  canCancel(entry: JournalEntry): boolean {
    return this.normalizeStatus(entry.status) === JournalStatus.Posted;
  }

  private normalizeStatus(status: any): JournalStatus {
    if (typeof status === 'number') {
      return status as JournalStatus;
    }

    if (typeof status === 'string') {
      // لو جاي كـ string زي "Posted"
      const mapped = JournalStatus[status as keyof typeof JournalStatus];
      if (mapped !== undefined) {
        return mapped;
      }

      const parsed = Number(status);
      if (!isNaN(parsed)) {
        return parsed as JournalStatus;
      }
    }

    console.warn('Unrecognized status value:', status);
    return status as JournalStatus;
  }
}
