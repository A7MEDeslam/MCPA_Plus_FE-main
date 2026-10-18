import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SerialNumberService } from '../../services/serial-number.service';
import { ProjectService } from '../../services/project.service';
import { MasterDataService } from '../../services/master-data.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';

@Component({
  selector: 'app-serials',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './serials.component.html',
  styleUrl: './serials.component.css',
})
export class SerialsComponent implements OnInit {
  @Input() embedded = false;
  serialService = inject(SerialNumberService);
  projectService = inject(ProjectService);
  masterData = inject(MasterDataService);
  toastService = inject(ToastService);
  authService = inject(AuthService);
  route = inject(ActivatedRoute);
  router = inject(Router);

  get canAssign() {
    return this.authService.hasAnyRole(['CEO', 'Engineer', 'Admin']);
  }

  pagination = useDynamicPagination();

  serialSearch = signal('');
  sortColumn = signal<string>('serial');
  sortDir = signal<'asc' | 'desc'>('asc');

  toggleSort(col: string) {
    if (this.sortColumn() === col) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(col);
      this.sortDir.set('asc');
    }
  }
  modalOpen = false;
  assignModalOpen = false;
  selectedSerialId: number | null = null;
  selectedProjectId: number | null = null;
  viewingSerials: any[] = [];
  viewingSerialsTitle = '';
  returnUrl = '/serials';

  get viewingSerialsInStock() {
    return this.serialService
      .Serials()
      .filter((s) => s.status === 'InStock' || s.status === 'In Stock');
  }

  get viewingSerialsOutOfStock() {
    return this.serialService
      .Serials()
      .filter((s) => s.status !== 'InStock' && s.status !== 'In Stock');
  }

  filteredSerials = computed(() => {
    const term = this.serialSearch().toLowerCase().trim();
    let data = this.serialService.Serials().filter(
      (s) =>
        !term ||
        Object.values(s).some((val) =>
          String(val ?? '')
            .toLowerCase()
            .includes(term),
        ),
    );

    const col = this.sortColumn();
    const dir = this.sortDir();
    if (col) {
      data = [...data].sort((a, b) => {
        let valA = a[col];
        let valB = b[col];

        if (col === 'productionDate') {
          const dateA = valA ? new Date(valA).getTime() : 0;
          const dateB = valB ? new Date(valB).getTime() : 0;
          return dir === 'asc' ? dateA - dateB : dateB - dateA;
        }

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (valA < valB) return dir === 'asc' ? -1 : 1;
        if (valA > valB) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  });

  pagedSerials = computed(() => {
    const data = this.filteredSerials();
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  ngOnInit() {
    this.projectService.fetchAll();

    this.route.queryParams.subscribe((params) => {
      const type = params['type'] as string | undefined;
      const id = params['id'] as string | undefined;
      const requestedReturnUrl = params['returnUrl'] as string | undefined;
      this.returnUrl = requestedReturnUrl?.startsWith('/') && !requestedReturnUrl.startsWith('//')
        ? requestedReturnUrl
        : '/serials';

      if (type === 'wo' && id) {
        const workOrderId = Number(id);
        this.serialService.fetchByWorkOrder(workOrderId);
        this.viewingSerialsTitle = `Serials for WO ${workOrderId}`;
        this.modalOpen = true;
      } else if (type === 'product' && id) {
        const finishedProductId = Number(id);
        this.serialService.fetchByFinishedProduct(finishedProductId);
        const product = this.masterData.PRODUCTS().find((p) => p.id === finishedProductId);
        this.viewingSerialsTitle = `Serials for ${product?.name || 'Product #' + id}`;
        this.modalOpen = true;
      } else if (type === 'project' && id) {
        const projectId = Number(id);
        this.serialService.fetchByProject(projectId);
        this.viewingSerialsTitle = `Serials for ${params['name'] || 'Project #' + id}`;
        this.modalOpen = true;
      } else {
        if (this.router.url.split('?')[0] === '/serials') {
          this.router.navigate(['/fgwh'], { queryParams: { tab: 'serials' }, replaceUrl: true });
          return;
        }
        this.serialService.fetchAll();
        this.modalOpen = false;
      }
    });
  }

  closeModalIfOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  closeModal() {
    this.modalOpen = false;
    this.router.navigateByUrl(this.returnUrl);
  }

  openAssignModal(serialId: number) {
    this.selectedSerialId = serialId;
    this.selectedProjectId = null;
    this.assignModalOpen = true;
  }

  closeAssignModalIfOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.assignModalOpen = false;
    }
  }
  get canSeeCustomerName() {
    return this.authService.hasAnyRole(['CEO', 'Engineer']);
  }
  get tableColspan(): number {
    return this.canSeeCustomerName ? 11 : 10;
  }
  assignToProject() {
    if (!this.selectedSerialId || !this.selectedProjectId) {
      return alert('Select a serial number and project.');
    }

    this.serialService.assignToProject(this.selectedSerialId, this.selectedProjectId).subscribe({
      next: () => {
        this.serialService.fetchAll();
        this.masterData.fetchFinishedProducts(); // add this
        this.assignModalOpen = false;
        this.toastService.show('Serial number assigned to project!');
      },
      error: (err) => {
        console.error('Failed to assign serial to project:', err);
        alert(err?.error?.message || 'Failed to assign serial to project.');
      },
    });
  }
}


