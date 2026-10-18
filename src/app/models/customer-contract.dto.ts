export enum ContractWorkflowStatus {
  PendingCcoApproval = 1,
  PendingLegalReviewApproval = 2,
  PendingCeoApproval = 3,
  DealDone = 4,
  Rejected = 5,
}

export interface ContractBillOfQuantityItem {
  id: number;
  scope: string;
  item: string;
  quantity: number;
}

export interface CustomerContractSummary {
  contractId: number;
  customerId?: number;
  customerName?: string;
  customerStatus?: number;
  customerStatusName?: string;
  startedFromStatus: number;
  startedFromStatusName: string;
  contractTitle: string;
  contractStartDate: string;
  contractEndDate: string;
  exclusions: string;
  terms: string;
  comments: string;
  status: ContractWorkflowStatus;
  statusName: string;
  currentApprovalStage?: string;
  canEditBillOfQuantity?: boolean;
  stageChangeRequest?: unknown;
  billOfQuantity: ContractBillOfQuantityItem[];
  approvalActions?: unknown[];
  createdAt?: string;
  updatedAt?: string | null;
}

export interface ContractApprovalPayload {
  isApproved: boolean;
  comment: string;
}

export interface SubContractBoqItemPayload {
  scope: string;
  item: string;
  quantity: number;
  finishedProductId: number;
}

export interface SubContractPayload {
  contractTitle: string;
  contractStartDate: string;
  contractEndDate: string;
  exclusions: string;
  terms: string;
  comments: string;
  boqItems: SubContractBoqItemPayload[];
}
export interface UpdateBillOfQuantityItem {
  id: number; 
  scope: string;
  item: string;
  quantity: number;
}

export interface UpdateBillOfQuantityPayload {
  items: UpdateBillOfQuantityItem[];
}