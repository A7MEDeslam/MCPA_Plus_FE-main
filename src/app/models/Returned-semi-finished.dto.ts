// Mirrors backend enum ReturnAction:
// 1 = MoveToGood         -> no recovered materials, no maintenance materials
// 2 = Recycle            -> recovered materials only
// 3 = Maintain           -> maintenance materials only
// 4 = ScrapWithApproval  -> damaged, isGood forced false, waits for CEO approval
export enum ReturnedSemiFinishedActionEnum {
  MoveToGood = 1,
  Recycle = 2,
  Maintain = 3,
  ScrapWithApproval = 4,
}

export interface RawMaterialLine {
  rawMaterialId: number;
  rawMaterialName?: string; // populated client-side when list is available
  quantity: number;
}

export interface ReturnedSemiFinished {
  id: number;
  semiFinishedId: number;
  semiFinishedName: string;
  semiFinishedCode: string;
  reason: string;
  isGood: boolean;
  actionId: number;
  action: string;
  approvalStatusId: number;
  approvalStatus: string; // e.g. "NotRequired" | "Pending" | "Approved" | "Rejected"
  approvalNotes: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  isResolved: boolean;
  createdAt: string;
  recoveredMaterials: RawMaterialLine[];
  maintenanceMaterials: RawMaterialLine[];
  expanded?: boolean; // UI-only flag for the registry row expand/collapse toggle
}

export interface CreateReturnedSemiFinishedDto {
  semiFinishedId: number;
  reason: string;
  isGood: boolean;
  action: number;
  recoveredRawMaterials: { rawMaterialId: number; quantity: number }[];
  maintenanceRawMaterials: { rawMaterialId: number; quantity: number }[];
}

export interface ApproveScrapDto {
  isApproved: boolean;
  notes: string;
  ceoUserId: number;
}
