import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AssetDto, AssetTreeDto, CreateAssetDto } from '../models/asset.dto';

@Injectable({ providedIn: 'root' })
export class AssetService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/assets';

  // Signals for state management
  assets = signal<AssetDto[]>([]);
  assetTree = signal<AssetTreeDto[]>([]);
  purchasableAssets = signal<AssetDto[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  /**
   * Get all assets with optional filters
   */
  getAll(level?: number, parentId?: number, search?: string) {
    this.loading.set(true);
    this.error.set(null);

    let url = this.baseUrl;
    const params = new URLSearchParams();

    if (level !== undefined) params.append('level', level.toString());
    if (parentId !== undefined) params.append('parentId', parentId.toString());
    if (search) params.append('search', search);

    if (params.toString()) {
      url += '?' + params.toString();
    }

    this.http.get<AssetDto[]>(url).subscribe({
      next: (data) => {
        this.assets.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch assets:', err);
        this.error.set(err.message || 'Failed to fetch assets');
        this.loading.set(false);
      }
    });
  }

  /**
   * Get asset tree structure (hierarchical view)
   */
  getTree() {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<AssetTreeDto[]>(`${this.baseUrl}/tree`).subscribe({
      next: (data) => {
        this.assetTree.set(data);
        this.purchasableAssets.set(this.extractPurchasableAssets(data ?? []));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch asset tree:', err);
        this.error.set(err.message || 'Failed to fetch asset tree');
        this.loading.set(false);
      }
    });
  }

  /**
   * Get a single asset by ID
   */
  getById(id: number) {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<AssetDto>(`${this.baseUrl}/${id}`);
  }

  /**
   * Get children of an asset
   */
  getChildren(id: number) {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<AssetDto[]>(`${this.baseUrl}/${id}/children`);
  }

  /**
   * Create a new asset
   */
  create(dto: CreateAssetDto) {
    this.loading.set(true);
    this.error.set(null);

    return this.http.post<AssetDto>(`${this.baseUrl}`, dto);
  }

  /**
   * Refresh the assets list
   */
  refresh(level?: number, parentId?: number, search?: string) {
    this.getAll(level, parentId, search);
  }

  /**
   * Refresh the asset tree
   */
  refreshTree() {
    this.getTree();
  }

  /** Level 4+ leaf assets eligible for purchase orders */
  private extractPurchasableAssets(nodes: AssetTreeDto[]): AssetDto[] {
    const result: AssetDto[] = [];

    const walk = (list: AssetTreeDto[]) => {
      for (const node of list) {
        const isLeaf = !node.children?.length;
        if (node.level >= 4 && isLeaf && node.isActive) {
          result.push({
            id: node.id,
            accountNo: node.accountNo,
            name: node.name,
            level: node.level,
            isActive: node.isActive,
            parentId: null,
            parentName: null,
            createdAt: new Date(),
            updatedAt: null
          });
        }
        if (node.children?.length) {
          walk(node.children);
        }
      }
    };

    walk(nodes);
    return result;
  }
}
