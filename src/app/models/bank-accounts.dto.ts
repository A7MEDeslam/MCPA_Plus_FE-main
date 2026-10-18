export enum AccountType {
  Asset = 1,
  Liability = 2,
  Expense = 3,
  Revenue = 4,
  Equilty = 5,
}

export interface BankAccount {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  parentId?: number | null;
  level?: number;
  balance?: number;
  currency?: string;
  isActive?: boolean;
  parent?: BankAccount | null;
  children?: BankAccount[];
  createdAt?: string;
  updatedAt?: string | null;
  createdByUserId?: string;
  updatedByUserId?: string | null;
  isDeleted?: boolean;
}

export interface BankAccountRow extends BankAccount {
  level: number;
  expanded: boolean;
  visible: boolean;
  hasChildren: boolean;
}

export interface CreateBankAccountRequest {
  code: string;
  name: string;
  parentId: number | null;
  type: AccountType;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.Asset]: 'Asset',
  [AccountType.Liability]: 'Liability',
  [AccountType.Expense]: 'Expense',
  [AccountType.Revenue]: 'Revenue',
  [AccountType.Equilty]: 'Equity',
};

export const ACCOUNT_TYPE_CLASS: Record<AccountType, string> = {
  [AccountType.Asset]: 'asset',
  [AccountType.Liability]: 'liability',
  [AccountType.Expense]: 'expense',
  [AccountType.Revenue]: 'revenue',
  [AccountType.Equilty]: 'equity',
};
export interface UpdateBankAccountRequest {
  name: string;
  code: string;
  type: number;
  isActive: boolean;
}

export interface JournalEntryHistoryRow {
  journalEntryId: number;
  entryNumber: string;
  postingDate: string;
  documentDate: string;
  reference: string;
  note: string;
  debit: number;
  credit: number;
  description: string;
}
