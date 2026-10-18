import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { useDynamicPagination } from '../../utils/pagination-helper';

type StockRow = { serial: string; product: string; productionType: 'MTS' | 'MTO'; location: 'Finished Goods' | 'Third Party'; status: 'Available' | 'Reserved' | 'In Processing' | 'Delivered'; customer: string; contract: string; workOrder: string; productionDate: string; };

@Component({ selector: 'app-stock', standalone: true, imports: [CommonModule, FormsModule, PaginationComponent], templateUrl: './stock.component.html', styleUrl: './stock.component.css' })
export class StockComponent {
  readonly pagination = useDynamicPagination();
  readonly search = signal(''); readonly productionType = signal('All'); readonly location = signal('All'); readonly status = signal('All');
  readonly rows: StockRow[] = [
    { serial: 'MTS-CP100-000001', product: 'Control Panel 100', productionType: 'MTS', location: 'Finished Goods', status: 'Available', customer: '—', contract: '—', workOrder: 'WO-0001', productionDate: 'Oct 16, 2026' },
    { serial: 'MTS-CP100-000005', product: 'Control Panel 100', productionType: 'MTS', location: 'Finished Goods', status: 'Reserved', customer: 'Cairo Smart Facilities', contract: 'CT-0121', workOrder: 'WO-0001', productionDate: 'Oct 16, 2026' },
    { serial: 'MTS-PQB-000001', product: 'Power Quality Beacon', productionType: 'MTS', location: 'Third Party', status: 'In Processing', customer: '—', contract: '—', workOrder: 'WO-0002', productionDate: 'Oct 15, 2026' },
    { serial: 'MTO-IG200-000014', product: 'Industrial Gateway', productionType: 'MTO', location: 'Finished Goods', status: 'Reserved', customer: 'Delta Technology', contract: 'CT-0113', workOrder: 'WO-0003', productionDate: 'Oct 14, 2026' },
    { serial: 'MTO-IG200-000015', product: 'Industrial Gateway', productionType: 'MTO', location: 'Third Party', status: 'Delivered', customer: 'Delta Technology', contract: 'CT-0113', workOrder: 'WO-0003', productionDate: 'Oct 14, 2026' },
  ];
  readonly filteredRows = computed(() => { const term = this.search().trim().toLowerCase(); return this.rows.filter(row => (!term || Object.values(row).some(value => String(value).toLowerCase().includes(term))) && (this.productionType() === 'All' || row.productionType === this.productionType()) && (this.location() === 'All' || row.location === this.location()) && (this.status() === 'All' || row.status === this.status())); });
  readonly pagedRows = computed(() => { const rows = this.filteredRows(); const page = this.pagination.currentPage(); const size = this.pagination.pageSize(); return rows.slice((page - 1) * size, page * size); });
  readonly totalUnits = computed(() => this.rows.length); readonly reservedUnits = computed(() => this.rows.filter(row => row.status === 'Reserved').length); readonly thirdPartyUnits = computed(() => this.rows.filter(row => row.location === 'Third Party').length);

  resetPage() { this.pagination.currentPage.set(1); }
  clearFilters() { this.search.set(''); this.productionType.set('All'); this.location.set('All'); this.status.set('All'); this.resetPage(); }
}
