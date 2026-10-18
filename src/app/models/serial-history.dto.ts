export interface SerialHistoryEntry {
  id: number;
  serialNumberId: number;
  serial: string;
  finishedProductId: number;
  finishedProductName: string;
  actionType: number;
  actionTypeName: string;
  fromStatus: number;
  fromStatusName: string;
  toStatus: number;
  toStatusName: string;
  customerContractId: number | null;
  deliveryRequestId: number | null;
  deliveryRequestNumber: string | null;
  notes: string | null;
  actionByUserId: string;
  actionByName: string;
  actionAt: string;
}

export interface SerialHistory {
  serialNumberId: number;
  serial: string;
  finishedProductId: number;
  finishedProductName: string;
  currentStatus: number;
  currentStatusName: string;
  customerContractId: number | null;
  history: SerialHistoryEntry[];
}
