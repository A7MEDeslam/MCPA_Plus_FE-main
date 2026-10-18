import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditLog, AuditLogDetail, AuditLogService } from '../../services/audit-log';

interface DiffRow {
  field: string;
  oldValue: any;
  newValue: any;
  changed: boolean;
}

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-logs.html',
  styleUrl: './audit-logs.css',
})
export class AuditLogs implements OnInit {
  private api = inject(AuditLogService);

  logs = signal<AuditLog[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // filters
  search = signal('');
  actionFilter = signal('');
  entityFilter = signal('');
  userFilter = signal('');
  dateFrom = signal('');
  dateTo = signal('');

  // paging
  page = signal(1);
  pageSize = signal(15);

  // details dialog
  selected = signal<AuditLogDetail | null>(null);
  diffRows = signal<DiffRow[]>([]);
  detailLoading = signal(false);

  entities = computed(() => [...new Set(this.logs().map((l) => l.entityName))].sort());
  users = computed(() => [...new Set(this.logs().map((l) => l.userName))].sort());

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const from = this.dateFrom() ? new Date(this.dateFrom()).getTime() : null;
    const to = this.dateTo() ? new Date(this.dateTo()).getTime() + 86_400_000 : null;

    return this.logs()
      .filter((l) => {
        if (this.actionFilter() && l.action !== this.actionFilter()) return false;
        if (this.entityFilter() && l.entityName !== this.entityFilter()) return false;
        if (this.userFilter() && l.userName !== this.userFilter()) return false;
        const t = new Date(l.createdAt).getTime();
        if (from && t < from) return false;
        if (to && t >= to) return false;
        if (q) {
          const hay =
            `${l.description} ${l.userName} ${l.entityName} ${l.entityId} ${l.endpoint} ${l.ipAddress}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.id - a.id); // newest first
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getAll().subscribe({
      next: (data) => {
        this.logs.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load audit logs.');
        this.loading.set(false);
      },
    });
  }

  // reset to first page whenever a filter changes
  onFilterChange() {
    this.page.set(1);
  }

  clearFilters() {
    this.search.set('');
    this.actionFilter.set('');
    this.entityFilter.set('');
    this.userFilter.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.page.set(1);
  }

  prev() {
    if (this.page() > 1) this.page.update((p) => p - 1);
  }
  next() {
    if (this.page() < this.totalPages()) this.page.update((p) => p + 1);
  }

  openDetails(log: AuditLog) {
    this.detailLoading.set(true);
    this.selected.set({ ...log, oldValues: null, newValues: null, changedColumns: null });
    this.diffRows.set([]);
    this.api.getById(log.id).subscribe({
      next: (d) => {
        this.selected.set(d);
        this.diffRows.set(this.buildDiff(d));
        this.detailLoading.set(false);
      },
      error: () => this.detailLoading.set(false),
    });
  }

  closeDetails() {
    this.selected.set(null);
  }

  private parse(json: string | null): Record<string, any> {
    if (!json) return {};
    try {
      const v = JSON.parse(json);
      return typeof v === 'object' && v ? v : {};
    } catch {
      return {};
    }
  }

  private buildDiff(d: AuditLogDetail): DiffRow[] {
    const oldV = this.parse(d.oldValues);
    const newV = this.parse(d.newValues);
    const changed = new Set(
      (d.changedColumns ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
    const keys = [...new Set([...Object.keys(oldV), ...Object.keys(newV)])];
    return keys.map((k) => ({
      field: k,
      oldValue: oldV[k],
      newValue: newV[k],
      changed: changed.has(k) || JSON.stringify(oldV[k]) !== JSON.stringify(newV[k]),
    }));
  }

  actionClass(action: string) {
    return (
      { create: 'badge-create', update: 'badge-update', delete: 'badge-delete' }[
        action.toLowerCase()
      ] ?? 'badge-other'
    );
  }

  methodClass(m: string) {
    return 'method-' + m.toLowerCase();
  }

  show(v: any) {
    return v === null || v === undefined
      ? '—'
      : typeof v === 'object'
        ? JSON.stringify(v)
        : String(v);
  }
}
