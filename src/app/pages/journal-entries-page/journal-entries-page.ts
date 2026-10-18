import { CostCenters } from './../cost-centers/cost-centers';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { JournalEntryTable } from '../../components/journal-entry-table/journal-entry-table';
import { JournalEntryForm } from '../../components/journal-entry-form/journal-entry-form';
import { JournalEntryDetailsComponent } from '../../components/journal-entry-details/journal-entry-details';

import { JournalEntriesService } from '../../services/journal-entries';
import { JournalEntry } from '../../models/journal-entry.dto';
@Component({
  selector: 'app-journal-entries',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    JournalEntryTable,
    JournalEntryForm,
    JournalEntryDetailsComponent,
    CostCenters,
  ],
  templateUrl: './journal-entries-page.html',
  styleUrl: './journal-entries-page.css',
})
export class JournalEntriesPage implements OnInit {
  entries: JournalEntry[] = [];
  filteredEntries: JournalEntry[] = [];

  search = '';
  selectedStatus: string = 'All';

  showForm = false;
  showDetails = false;

  selectedEntry?: JournalEntry;
  entryToEdit: JournalEntry | null = null;

  statuses = ['All', 'Draft', 'Posted', 'Cancelled'];

  constructor(
    private service: JournalEntriesService,
    private cdr: ChangeDetectorRef,
  ) {}
  showCostCenterDialog = false;

  addCostCenter() {
    this.showCostCenterDialog = true;
  }

  costCenterSaved() {
    this.showCostCenterDialog = false;
  }

  costCenterCancelled() {
    this.showCostCenterDialog = false;
  }
  ngOnInit(): void {
    this.loadEntries();
  }

  loadEntries() {
    this.service.getAll().subscribe((res) => {
      this.entries = res;
      this.filteredEntries = res;
      this.cdr.detectChanges();
    });
  }

  addNew() {
    this.entryToEdit = null;
    this.showForm = true;
    this.showDetails = false;
  }

  editEntry(entry: JournalEntry) {
    this.entryToEdit = entry;
    this.showForm = true;
    this.showDetails = false;
  }

  cancelForm() {
    this.showForm = false;
    this.entryToEdit = null;
  }

  saved() {
    this.showForm = false;
    this.entryToEdit = null;
    this.loadEntries();
  }

  view(entry: JournalEntry) {
    this.selectedEntry = entry;
    this.showDetails = true;
  }

  closeDetails() {
    this.showDetails = false;
  }

  searchChanged() {
    this.applyFilters();
  }

  filterByStatus(status: string) {
    this.selectedStatus = status;
    this.applyFilters();
  }

  applyFilters() {
    const text = this.search.trim().toLowerCase();

    this.filteredEntries = this.entries.filter((e) => {
      const matchesSearch =
        String(e.entryNumber ?? '')
          .toLowerCase()
          .includes(text) ||
        String(e.reference ?? '')
          .toLowerCase()
          .includes(text) ||
        String(e.status ?? '')
          .toLowerCase()
          .includes(text);
      const matchesStatus =
        this.selectedStatus === 'All'
          ? true
          : String(e.status).toLowerCase() === this.selectedStatus.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }

  cancelEntry(entry: JournalEntry) {
    const confirmed = confirm(`Are you sure? ${entry.entryNumber}؟`);
    if (!confirmed) return;

    this.service.cancel(entry.id).subscribe({
      next: () => {
        this.loadEntries();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Cancel failed:', err);
        alert('failed');
      },
    });
  }
}
