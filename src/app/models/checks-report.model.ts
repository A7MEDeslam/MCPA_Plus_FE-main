export interface CheckReportExpense {
  expenseId: number;
  documentNumber: string;
  employeeName: string;
  categoryName: string;
  amount: number;
  expenseDate: string;
  description: string;
  status: string;
}

export interface CheckReportRequestItem {
  id: number;
  requestNumber: string;
  payeeName: string;
  amount: number;
  status: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  expenses: CheckReportExpense[];
}

export interface CheckReportGroup {
  checkNumber: string;
  bankName: string;
  totalAmount: number;
  requestsCount: number;
  requests: CheckReportRequestItem[];
}

export interface ChecksReportFilter {
  from?: string;
  to?: string;
  bankAccountId?: number;
  checkNumber?: string;
  status?: number;
}

export enum CheckRequestStatus {
  PendingApproval = 1,
  Approved = 2,
  Rejected = 3,
  Issued = 4,
}
export interface CheckBook {
  id: number;
  checkNumber: string;
  bankAccountId: number;
  bankAccountCode: string;
  bankAccountName: string;
}
