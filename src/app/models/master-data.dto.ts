export interface InventoryTransactionDto {
  id: number;
  itemType: string;
  itemId?: number;
  itemCode?: string;
  itemName?: string;
  warehouseId?: number;
  warehouseName?: string;
  transactionType: string;
  quantityIn: number;
  quantityOut: number;
  balanceAfter: number;
  referenceType: string;
  referenceId: number;
  referenceNumber: string;
  transactionDate: string;
  notes?: string;
}

export interface CreateRawMaterialLinkDto {
  url: string;
  label?: string;
}

export interface CreateRawMaterialSupplierDto {
  supplierId: number;
  isPreferred: boolean;
}

export interface CreateRawMaterialDto {
  code?: string;
  name: string;
  unit: string;
  minStockLevel: number;
  links: CreateRawMaterialLinkDto[];
  suppliers?: CreateRawMaterialSupplierDto[];
}

export interface UpdateRawMaterialLinksDto {
  links: CreateRawMaterialLinkDto[];
}

export interface UpdateRawMaterialSuppliersDto {
  suppliers: CreateRawMaterialSupplierDto[];
}

export interface RawMaterialLinkDto {
  id: number;
  url: string;
  label?: string;
}

export interface RawMaterialSupplierDto {
  supplierId: number;
  supplierName: string;
  isPreferred: boolean;
}

export interface RawMaterialResponseDto {
  id: number;
  code: string;
  name: string;
  unit: string;
  currentStock: number;
  minStockLevel: number;
  stockStatus: string;
  links: RawMaterialLinkDto[];
  suppliers: RawMaterialSupplierDto[];
}

export interface ProjectMaterialAssignmentDto {
  id: number;
  projectId: number;
  projectName: string;
  rawMaterialId: number;
  rawMaterialName: string;
  rawMaterialCode: string;
  fromWarehouseId: number;
  fromWarehouse: string;
  toWarehouseId: number;
  toWarehouse: string;
  quantity: number;
  notes?: string;
  createdAt: string;
}

export interface SupplierResponseDto {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  isActive: boolean;
}

export interface WarehouseResponseDto {
  id: number;
  code: string;
  name: string;
  type: number;
  typeName: string;
}

export interface CreateFinishedProductDto {
  code?: string;
  name: string;
  serialPrefix: string;
  serialStartNumber: number;
  modelType?: string;
}

export interface CreateBalanceInitializeDto {
  rawMaterialId: number;
  balanceDate: string;
  adjustedStock: number;
  notes?: string;
}

export interface ApproveBalanceInitializeDto {
  accountantUserId: number;
  isApproved: boolean;
  notes?: string;
}

export interface BalanceInitializeResponseDto {
  id: number;
  rawMaterialId: number;
  rawMaterialName: string;
  balanceDate: string;
  existingStock: number;
  adjustedStock: number;
  gap: number;
  status: string;
  approvedAt?: string;
  createdByName?: string;
  notes?: string;
}
