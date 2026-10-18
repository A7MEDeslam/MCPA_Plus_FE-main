export type CheckReallocationStatus = 'PendingApproval' | 'Approved' | 'Rejected';

export const REALLOCATION_STATUS_LABELS: Record<CheckReallocationStatus, string> = {
  PendingApproval: 'Pending Approval',
  Approved: 'Approved',
  Rejected: 'Rejected',
};

export const REALLOCATION_STATUS_CLASS: Record<CheckReallocationStatus, string> = {
  PendingApproval: 'status-pending',
  Approved: 'status-approved',
  Rejected: 'status-rejected',
};

export interface ReallocationExpense {
  expenseReportId: number;
  documentNumber: string;
  amount: number;
}

export interface CheckReallocation {
  id: number;
  requestNumber: string;
  checkRequestId: number;
  checkRequestNumber: string;
  checkNumber: string;
  amount: number;
  reason: string;
  status: CheckReallocationStatus;
  createdByName: string;
  createdAt: string;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
  expenses: ReallocationExpense[];
}

export interface CreateCheckReallocation {
  expenseReportIds: number[];
  reason: string;
}
