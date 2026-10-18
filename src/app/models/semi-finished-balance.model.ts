export interface SemiFinishedBalance {
  id: number;
  semiFinishedId: number;
  semiFinishedName: string;
  balanceDate: string;
  existingStock: number;
  adjustedStock: number;
  gap: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedAt: string | null;
  notes: string;
  createdByName: string;
}

export interface CreateSemiFinishedBalance {
  semiFinishedId: number;
  balanceDate: string;
  adjustedStock: number;
  notes: string;
}

export interface ApproveRejectSemiFinishedBalance {
  accountantUserId: string;
  isApproved: boolean;
  notes: string;
}
