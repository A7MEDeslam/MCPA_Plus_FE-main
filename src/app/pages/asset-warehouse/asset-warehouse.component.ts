import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MasterDataService } from '../../services/master-data.service';
import { InventoryService } from '../../services/inventory.service';
import { AssetReceiptService } from '../../services/asset-receipt.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';

@Component({
  selector: 'app-asset-warehouse',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './asset-warehouse.component.html',
  styleUrl: './asset-warehouse.component.css'
})
export class AssetWarehouseComponent implements OnInit {
  masterData = inject(MasterDataService);
  inventory = inject(InventoryService);
  arService = inject(AssetReceiptService);

  pagination = useDynamicPagination();
  assetSearch = signal('');

  ngOnInit() {
    this.inventory.fetchAssetItems();
    this.arService.fetchARs();
  }

  assetWarehouse = computed(() =>
    this.masterData.WAREHOUSES().find(w => w.type === 4)
  );

  // All asset items in the asset warehouse
  filteredAssets = computed(() => {
    const term = this.assetSearch().toLowerCase().trim();
    const items = this.inventory.AssetItems();
    return items.filter(a =>
      !term || [a.accountNo, a.name].join(' ').toLowerCase().includes(term)
    );
  });

  pagedAssets = computed(() => {
    const data = this.filteredAssets();
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  totalItems = computed(() => this.inventory.AssetItems().length);
  totalReceipts = computed(() => this.arService.ARs().length);
}
