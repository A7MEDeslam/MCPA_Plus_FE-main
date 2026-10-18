export enum ExpenseStatus {
  PendingApproval = 1,
  Approved = 2,
  Rejected = 3,
  AssignedToCheck = 4,
}

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  [ExpenseStatus.PendingApproval]: 'Pending Approval',
  [ExpenseStatus.Approved]: 'Approved',
  [ExpenseStatus.Rejected]: 'Rejected',
  [ExpenseStatus.AssignedToCheck]: 'Assigned To Check',
};

export const EXPENSE_STATUS_CLASS: Record<ExpenseStatus, string> = {
  [ExpenseStatus.PendingApproval]: 'pending',
  [ExpenseStatus.Approved]: 'approved',
  [ExpenseStatus.Rejected]: 'rejected',
  [ExpenseStatus.AssignedToCheck]: 'assigned',
};

export function expenseStatusClass(status: string): string {
  switch (status) {
    case 'PendingApproval':
      return 'pending';
    case 'Approved':
      return 'approved';
    case 'Rejected':
      return 'rejected';
    case 'AssignedToCheck':
      return 'assigned';
    case 'Posted':
      return 'posted';
    default:
      return 'draft';
  }
}

export function expenseStatusLabel(status: string): string {
  switch (status) {
    case 'PendingApproval':
      return 'Pending Approval';
    case 'AssignedToCheck':
      return 'Assigned To Check';
    default:
      return status;
  }
}

export interface ExpenseReport {
  id: number;
  employeeName: string | null;
  documentNumber: string | null;
  date: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  categoryName: string;
  accountCode: string | null;
  createdAt: string;
}

export interface CreateExpenseReport {
  accountId: number;
  amount: number;
  currency: string;
  expenseDate: string;
  description: string;
  categoryId: number;
}

export interface UpdateExpenseReport {
  accountId: number;
  categoryId: number;
  amount: number;
  currency: string;
  expenseDate: string;
  description: string;
}

export interface RejectExpenseReport {
  reason: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
}

export interface ExpenseReportFilters {
  categoryId?: number;
  accountId?: number;
  status?: number;
  currency?: string;
  from?: string;
  to?: string;
  search?: string;
}
