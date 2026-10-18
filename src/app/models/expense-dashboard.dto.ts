export interface ExpenseDashboardSummary {
  totalExpenses: number;
  approvedAmount: number;
  pendingAmount: number;
  assignedToCheckAmount: number;
  totalTransactions: number;
}

export interface ExpenseDashboardCategory {
  categoryId: number;
  categoryName: string;
  count: number;
  totalAmount: number;
}

export interface ExpenseDashboardAccount {
  accountId: number;
  accountCode: string;
  accountName: string;
  totalAmount: number;
  count: number;
}

export interface ExpenseDashboardStatus {
  status: string;
  count: number;
  totalAmount: number;
}

export interface ExpenseDashboardRecent {
  id: number;
  employeeName: string;
  documentNumber: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  categoryName: string;
  accountCode: string;
  createdAt: string;
}

export interface ExpenseDashboard {
  summary: ExpenseDashboardSummary;
  byCategory: ExpenseDashboardCategory[];
  byAccount: ExpenseDashboardAccount[];
  byStatus: ExpenseDashboardStatus[];
  recentExpenses: ExpenseDashboardRecent[];
}

export interface ExpenseDashboardFilter {
  from?: string;
  to?: string;
  categoryId?: number;
  accountId?: number;
  employeeId?: string;
  status?: number;
}
