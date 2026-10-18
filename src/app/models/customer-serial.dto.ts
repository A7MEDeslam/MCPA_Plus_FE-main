export interface CustomerSerial {
  serialNumberId: number;
  serial: string;
  customerId: number;
  customerName: string;
  contractId: number;
  contractTitle: string;
  finishedProductId: number;
  finishedProductName: string;
  status: string;
  reservedAt: string | null;
  productionDate: string | null;
  soldDate: string | null;
}
