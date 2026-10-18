export enum ReturnAction {
  MoveToGood = 1,
  Recycle = 2,
  Maintain = 3,
  ScrapWithApproval = 4,
}

export enum ReturnApprovalStatus {
  NotRequired = 0,
  PendingCeo = 1,
  Approved = 2,
  Rejected = 3,
}

export enum SerialStatus {
  InStock = 1,
  Sold = 2,
  Scrapped = 3,
  Returned = 4,
  PendingCeoApproval = 5,
}

export interface RawMaterialLineDto {
  rawMaterialId: number;
  quantity: number;
}

export interface SemiFinishedLineDto {
  semiFinishedId: number;
  quantity: number;
}

// Tracked-serial flow — POST /api/ReturnWarehouse
// Backend now wants materials split by type instead of one generic list.
export interface CreateReturnedProductDto {
  serial: string;
  reason: string;
  isGood: boolean;
  action: ReturnAction;
  recoveredRawMaterials?: RawMaterialLineDto[];
  recoveredSemiFinisheds?: SemiFinishedLineDto[];
  maintenanceRawMaterials?: RawMaterialLineDto[];
  maintenanceSemiFinisheds?: SemiFinishedLineDto[];
}

// Old / untracked-serial flow — POST /api/ReturnWarehouse/old-serial
// Each line carries either a rawMaterialId or a semiFinishedId, not split into separate arrays.
export interface OldSerialMaterialLineDto {
  rawMaterialId?: number;
  semiFinishedId?: number;
  quantity: number;
}

export interface CreateReturnedProductOldSerialDto {
  finishedProductId: number;
  oldSerial: string;
  reason: string;
  isGood: boolean;
  action: ReturnAction;
  recoveredMaterials?: OldSerialMaterialLineDto[];
  maintenanceMaterials?: OldSerialMaterialLineDto[];
}

export interface ReturnMaterialLineResponseDto {
  rawMaterialId?: number;
  rawMaterialName?: string;
  rawMaterialCode?: string;
  semiFinishedId?: number;
  semiFinishedName?: string;
  semiFinishedCode?: string;
  unit: string;
  quantity: number;
}

export interface ReturnedProductResponseDto {
  id: number;
  serialNumberId: number;
  serial: string;
  productName: string;
  productCode: string;
  reason: string;
  isGood: boolean;
  action: string;
  actionId: number;
  approvalStatus: string;
  approvalStatusId: number;
  approvalNotes?: string;
  approvedAt?: string;
  approvedByName?: string;
  isResolved: boolean;
  createdAt: string;
  createdBy?: string;
  /** Origin of the returned unit. Older API responses may omit this field. */
  returnType?: 'Finished' | 'SemiFinished';
  recoveredMaterials: ReturnMaterialLineResponseDto[];
  maintenanceMaterials: ReturnMaterialLineResponseDto[];
}

export interface ApproveScrapDto {
  isApproved: boolean;
  notes?: string;
  ceoUserId: number;
}
