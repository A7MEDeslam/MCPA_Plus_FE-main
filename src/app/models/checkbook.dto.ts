export interface CheckBook {
  id: number;
  checkNumber: string;
  bankAccountId: number;
  bankAccountCode: string;
  bankAccountName: string;
}

export interface CreateCheckBook {
  checkNumber: string;
  bankAccountId: number;
}
