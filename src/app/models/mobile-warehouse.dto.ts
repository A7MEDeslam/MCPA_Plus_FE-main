export enum MobileWarehouseActionType {
  AssignedToProject = 1,
  ReturnedToStock = 2
}

export interface AssignItemToMobileWarehouseDto {
  warehouseId: number;
  rawMaterialId: number;
  quantity: number;
}

export interface AssignSerialsToMobileWarehouseDto {
  warehouseId: number;
  serialIds: number[];
}

export interface MobileItemActionDto {
  mobileWarehouseItemId: number;
  actionType: MobileWarehouseActionType;
  quantity: number;
  projectId?: number;
  notes?: string;
}

export interface MobileSerialActionDto {
  mobileWarehouseSerialId: number;
  actionType: MobileWarehouseActionType;
  projectId?: number;
  notes?: string;
}

export interface MobileItemActionResultDto {
  id: number;
  actionType: string;
  quantity: number;
  projectId?: number;
  projectName?: string;
  actionAt: string;
  actionByName: string;
  notes?: string;
}

export interface MobileWarehouseItemDto {
  id: number;
  warehouseId: number;
  warehouseName: string;
  rawMaterialId: number;
  rawMaterialName: string;
  rawMaterialCode: string;
  quantity: number;
  originalQuantity: number;
  assignedAt: string;
  assignedByName: string;
  actions: MobileItemActionResultDto[];
}

export interface MobileSerialActionResultDto {
  id: number;
  actionType: string;
  projectId?: number;
  projectName?: string;
  actionAt: string;
  actionByName: string;
  notes?: string;
}

export interface MobileWarehouseSerialDto {
  id: number;
  warehouseId: number;
  warehouseName: string;
  serialNumberId: number;
  serial: string;
  productName: string;
  isActive: boolean;
  assignedAt: string;
  assignedByName: string;
  actions: MobileSerialActionResultDto[];
}

export interface MobileWarehouseHistoryDto {
  id: number;
  transactionType: string;
  materialName: string;
  materialCode: string;
  quantityIn: number;
  quantityOut: number;
  balanceAfter: number;
  projectName?: string;
  transactionDate: string;
  notes?: string;
}
