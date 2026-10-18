export enum CheckRequestStatus {
  PendingApproval = 1,
  Approved = 2,
  Rejected = 3,
  Issued = 4,
}

export const CHECK_STATUS_LABELS: Record<CheckRequestStatus, string> = {
  [CheckRequestStatus.PendingApproval]: 'Pending Approval',
  [CheckRequestStatus.Approved]: 'Approved',
  [CheckRequestStatus.Rejected]: 'Rejected',
  [CheckRequestStatus.Issued]: 'Issued',
};

export const CHECK_STATUS_CLASS: Record<CheckRequestStatus, string> = {
  [CheckRequestStatus.PendingApproval]: 'pending',
  [CheckRequestStatus.Approved]: 'approved',
  [CheckRequestStatus.Rejected]: 'rejected',
  [CheckRequestStatus.Issued]: 'issued',
};

// Helper to map the string status coming back from GET /api/CheckRequests
// to the numeric enum used everywhere else in the UI.
export function statusFromString(status: string): CheckRequestStatus {
  switch (status) {
    case 'PendingApproval':
      return CheckRequestStatus.PendingApproval;
    case 'Approved':
      return CheckRequestStatus.Approved;
    case 'Rejected':
      return CheckRequestStatus.Rejected;
    case 'Issued':
      return CheckRequestStatus.Issued;
    default:
      return CheckRequestStatus.PendingApproval;
  }
}

export interface CheckRequest {
  id: number;
  employeeName: string;
  requestNumber: string;
  checkNumber: string | null;
  payeeName: string;
  amount: number;
  status: string; // raw string from API: "PendingApproval" | "Approved" | "Rejected" | "Issued"
  dueDate: string;
  issueDate: string;
  approvedBy: string | null;
  notes: string | null;
  expenseDocumentNumbers: string;
  bankAccountName: string;
  bankAccountCode: string;
  approvedByName: string | null;
}

export interface CreateCheckRequest {
  dueDate: string;
  issueDate: string;
  bankAccountId: number;
  checkBookId: number | null;
  payeeName: string;
  notes: string;
  expenseReportIds: number[];
}

export interface IssueCheckRequest {
  checkNumber: string;
}

// Minimal shape needed from GET /api/ExpenseReports for the multi-select
export interface ExpenseReport {
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
