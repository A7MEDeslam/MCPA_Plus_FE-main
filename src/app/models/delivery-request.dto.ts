// models/delivery-request.dto.ts

export enum DeliveryRequestStatus {
  PendingWarehouseApproval = 1,
  Approved = 2,
  Rejected = 3,
  PartiallyReceived = 4,
  Received = 5,
  Cancelled = 6,
}

export enum SerialDeliveryStatus {
  Reserved = 8,
  Received = 9,
  Installed = 10,
}

export interface CreateDeliveryRequestPayload {
  customerContractId: number;
  serialNumberIds: number[];
}

export interface EngineerDeliveryRequestListItem {
  id: number;
  requestNumber: string;
  customerContractId: number;
  customerId: number;
  customerName: string;
  contractTitle: string;
  status: string; // backend returns the status name as string
  totalSerials: number;
  receivedSerials: number;
}

export interface DeliveryRequestSerialItem {
  serialNumberId?: number;
  serial: string;
  serialStatus: string;
  isReceived: boolean;
  finishedProductId?: number;
  productCode?: string;
  productName?: string;
  receivedAt?: string | null;
}

export interface EngineerDeliveryRequestDetails {
  id: number;
  requestNumber: string;
  customerContractId: number;
  customerId: number;
  customerName: string;
  contractTitle: string;
  status: string;
  warehouseActionAt: string | null;
  warehouseComment: string | null;
  signedDocumentPath: string | null;
  totalSerials: number;
  receivedSerials: number;
  serials: DeliveryRequestSerialItem[];
  statusId?: number;
  requestedAt?: string;
}

export interface WarehouseSerialItem {
  serialNumberId: number;
  serial: string;
  finishedProductId: number;
  productCode: string;
  productName: string;
}

export interface WarehousePendingRequest {
  id: number;
  requestNumber: string;
  requestedAt: string;
  statusId?: number;
  status: string;
  quantity: number;
  serials: WarehouseSerialItem[];
}
export interface WarehouseDecisionPayload {
  isApproved: boolean;
  comment: string;
}

export interface ScanReceivePayload {
  serial: string;
}

export interface InstallSerialPayload {
  serial: string;
}
export type DeliveryRequestStatusName = keyof typeof DeliveryRequestStatus;
// models/delivery-request.dto.ts
export interface ReservedSerialItem {
  id: number;
  serial: string;
  finishedProductId: number;
}