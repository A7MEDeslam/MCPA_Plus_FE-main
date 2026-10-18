import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MasterDataService } from '../../services/master-data.service';
import { PurchaseOrderService } from '../../services/purchase-order.service';
import { WorkOrderService } from '../../services/work-order.service';
import { SerialNumberService } from '../../services/serial-number.service';
import { InventoryService } from '../../services/inventory.service';
import { ProjectService } from '../../services/project.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  masterData = inject(MasterDataService);
  poService = inject(PurchaseOrderService);
  workOrderService = inject(WorkOrderService);
  serialService = inject(SerialNumberService);
  inventoryService = inject(InventoryService);
  projectService = inject(ProjectService);

  pendPO = computed(() => this.poService.POs().filter(p => p.status === 'Pending').length);
  
  activeProd = computed(() => this.workOrderService.ActiveWorkOrders().length);
  
  totalFG = computed(() => 
    this.inventoryService.FinishedGoods().reduce((a: number, p: any) => a + (p.currentStock || 0), 0)
  );
  
  lowRMs = computed(() => 
    this.inventoryService.RawMaterials().filter((i: any) => (i.currentStock || 0) < (i.minStockLevel ?? 0))
  );
  
  lowRM = computed(() => this.lowRMs().length);
  
  totalSerials = computed(() => {
    const projId = this.projectService.selectedProjectId();
    const serials = this.serialService.Serials();
    if (projId) {
      return serials.filter(s => s.projectId === projId).length;
    }
    return serials.length;
  });
  
  recentPOs = computed(() =>
    this.poService.POs().slice().reverse().slice(0, 5)
  );
  
  activeWOs = computed(() => this.workOrderService.ActiveWorkOrders());

  pagination = useDynamicPagination();

  pagedLowRMs = computed(() => {
    const data = this.lowRMs();
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });
}
