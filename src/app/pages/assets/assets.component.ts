import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssetService } from '../../services/asset.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { CreateAssetDto } from '../../models/asset.dto';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { AssetTreeNodeComponent } from './asset-tree-node.component';
import { useDynamicPagination } from '../../utils/pagination-helper';

@Component({
  selector: 'app-assets',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, AssetTreeNodeComponent],
  templateUrl: './assets.component.html',
  styleUrl: './assets.component.css'
})
export class AssetsComponent {
  assetService = inject(AssetService);
  authService = inject(AuthService);
  toastService = inject(ToastService);

  get canCreateAsset() {
    return this.authService.hasAnyRole(['CEO', 'Accountant']);
  }

  pagination = useDynamicPagination();

  // Search filter
  searchTerm = signal('');
  filterLevel = signal<number | undefined>(undefined);

  // Modal state
  modalOpen = signal(false);
  viewMode = signal<'list' | 'tree'>('list');

  // Form
  form = {
    accountNo: '',
    name: '',
    parentId: null as number | null
  };

  // Available parents for dropdown
  availableParents = computed(() => {
    return this.assetService.assets().filter(a => a.isActive);
  });

  // Paginated assets
  pagedAssets = computed(() => {
    const data = this.assetService.assets();
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  constructor() {
    this.loadAssets();
  }

  /**
   * Load assets from backend
   */
  loadAssets() {
    const level = this.filterLevel();
    const search = this.searchTerm().trim();
    this.assetService.getAll(
      level !== undefined ? level : undefined,
      undefined,
      search || undefined
    );
  }

  /**
   * Load tree view
   */
  loadTree() {
    this.assetService.getTree();
  }

  /**
   * Handle search input change
   */
  onSearchChange() {
    this.pagination.resetPage();
    this.loadAssets();
  }

  /**
   * Handle level filter change
   */
  onFilterChange() {
    this.pagination.resetPage();
    this.loadAssets();
  }

  /**
   * Toggle between list and tree view
   */
  toggleView(view: 'list' | 'tree') {
    this.viewMode.set(view);
    if (view === 'tree') {
      this.loadTree();
    } else {
      this.loadAssets();
    }
  }

  /**
   * Open create modal
   */
  openModal() {
    this.resetForm();
    this.modalOpen.set(true);
  }

  /**
   * Close modal
   */
  closeModal() {
    this.modalOpen.set(false);
  }

  /**
   * Close modal when clicking on overlay
   */
  closeModalIfOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  /**
   * Reset form
   */
  resetForm() {
    this.form = {
      accountNo: '',
      name: '',
      parentId: null
    };
  }

  /**
   * Save new asset
   */
  saveAsset() {
    if (!this.form.accountNo.trim()) {
      this.toastService.show('Account Number is required.');
      return;
    }

    if (!this.form.name.trim()) {
      this.toastService.show('Name is required.');
      return;
    }

    const dto: CreateAssetDto = {
      accountNo: this.form.accountNo.trim(),
      name: this.form.name.trim(),
      parentId: this.form.parentId
    };

    this.assetService.create(dto).subscribe({
      next: (created) => {
        this.toastService.show(`Asset "${created.name}" created successfully.`);
        this.closeModal();
        this.loadAssets();
      },
      error: (err) => {
        const message = err.error?.message || err.message || 'Failed to create asset';
        this.toastService.show(message);
      }
    });
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  /**
   * Get level name
   */
  getLevelName(level: number): string {
    const levels: { [key: number]: string } = {
      1: 'Root',
      2: 'Group',
      3: 'Sub-Group',
      4: 'Item',
      5: 'Detail'
    };
    return levels[level] || `Level ${level}`;
  }
}
