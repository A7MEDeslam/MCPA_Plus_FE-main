export interface JournalEntry {
  id: number;
  entryNumber: string;

  documentDate: string;
  postingDate: string;

  period: string;

  status: JournalStatus;
  note: string;
  totalDebit: number;
  totalCredit: number;
  goodsReceiptNumber:string;
  reference: string;
  lines: JournalEntryLine[];
}

export interface JournalEntryLine {
  accountCode: string;
  accountName: string;

  debit: number;
  credit: number;
  costCenterName: string;

  description: string;
  expenseDescription?: string;
  expenseDocumentNumber?: number;
}

export interface CreateJournalEntryDto {
  documentDate: string;
  postingDate: string;

  reference: string;

  note: string;

  lines: CreateJournalEntryLineDto[];
}

export interface CreateJournalEntryLineDto {
  accountId: number;

  debit: number;

  credit: number;

  description: string;
}

export enum JournalStatus {
  Draft = 1,
  Posted = 2,
  Cancelled = 3,
}

export const JOURNAL_STATUS_CLASS: Record<JournalStatus, string> = {
  [JournalStatus.Draft]: 'draft',
  [JournalStatus.Posted]: 'posted',
  [JournalStatus.Cancelled]: 'cancelled',
};
export const JOURNAL_STATUS_LABELS: Record<JournalStatus, string> = {
  [JournalStatus.Draft]: 'Draft',
  [JournalStatus.Posted]: 'Posted',
  [JournalStatus.Cancelled]: 'Cancelled',
};
export interface UpdateJournalEntryDto {
  documentDate: string;
  postingDate: string;
  reference: string;
  note: string;
  lines: {
    accountId: number;
    debit: number;
    credit: number;
    description: string;
    expenseReportId: number | null;
  }[];
}
