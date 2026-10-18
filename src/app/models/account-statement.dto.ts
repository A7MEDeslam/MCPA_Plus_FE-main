export interface AccountStatementRequest {
  accountIds: number[];
  from?: string;
  to?: string;
  costCenterIds?: number[];
}

export interface AccountStatementTransaction {
  date: string;
  journalNumber: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  currentBalance: number;
}

export interface AccountStatementRow {
  accountCode: string;
  accountName: string;
  openingBalance: number;
  currentBalance: number;
  transactions: AccountStatementTransaction[];
}
