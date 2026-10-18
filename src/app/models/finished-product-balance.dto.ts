export interface FinishedProductBalance {
  id: number;
  finishedProductId: number;
  finishedProductName: string;
  balanceDate: string;
  existingStock: number;
  adjustedStock: number;
  gap: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedAt: string | null;
  notes: string;
  createdByName: string;
}

export interface CreateFinishedProductBalance {
  finishedProductId: number;
  balanceDate: string;
  adjustedStock: number;
  notes: string;
}

export interface ApproveRejectBalance {
  accountantUserId: string;
  isApproved: boolean;
  notes: string;
}
export interface FinishedProduct {
  id: number;
  name: string;
}
