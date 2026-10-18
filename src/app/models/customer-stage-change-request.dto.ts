import { CustomerStatus } from './customer.models';
import { PocPilotType } from './customer-poc-pilot.dto';

export enum QualificationEvidenceType {
  DecisionMakerIdentified = 1,
  BusinessProblemValidated = 2,
  BudgetRangeConfirmed = 3,
  TargetTimelineConfirmed = 4,
  TechnicalFeasibilityReviewed = 5,
  ProcurementProcessDocumented = 6,
}

export enum StageChangeApprovalStatus {
  Pending = 1,
  Approved = 2,
  Rejected = 3,
}

// TODO: only value 1 confirmed so far ("IndustrialAutomation") — add the rest as they're confirmed.
export enum OpportunityCategory {
  IndustrialAutomation = 1,
}

// TODO: only value 2 confirmed so far ("Strategic") — add the rest as they're confirmed.
export enum OpportunityPriority {
  Strategic = 2,
}

// TODO: replace `number` with the real EvidenceType enum once the backend confirms its values.
export interface StageEvidence {
  evidenceType: number;
  isCompleted: boolean;
  details: string;
}

export interface OpportunityDetailsPayload {
  opportunityValue: number;
  winProbability: number;
  expectedCloseDate: string;
  category: OpportunityCategory;
  priority: OpportunityPriority;
  businessNeed: string;
}

export interface BillOfQuantityItemPayload {
  finishedProductId: number;
  scope: string;
  item: string;
  qty: number;
}

export interface StageChangeApprovalPayload {
  isApproved: boolean;
  comment: string;
}

export interface PocOrPilotDetailsPayload {
  pilotTitle: string;
  pilotType: PocPilotType;
  plannedStart: string;
  plannedEnd: string;
  technicalOwnerId: string;
  objective: string;
  successCriteria: string;
  billOfQuantity: BillOfQuantityItemPayload[];
}

// export interface ContractDetailsPayload {
//   contractTitle: string;
//   contractStartDate: string;
//   contractEndDate: string;
//   exclusions: string;
//   terms: string;
//   comment: string;
//   billOfQuantity: BillOfQuantityItemPayload[];
// }

export interface StageChangeRequestPayload {
  toStatus: CustomerStatus;
  upgradeReason: string;
  targetDecisionDate: string;
  evidences: StageEvidence[];
  opportunityDetails?: OpportunityDetailsPayload;
  pocOrPilotDetails?: PocOrPilotDetailsPayload;
  contractDetails?: ContractDetailsPayload;
}

export interface StageChangeRequestRejectPayload {
  rejectionReason: string;
}

export interface StageChangeRequest {
  id: number;
  customerId: number;
  customerName: string;
  fromStatus: CustomerStatus;
  fromStatusName: string;
  toStatus: CustomerStatus;
  toStatusName: string;
  upgradeReason: string;
  targetDecisionDate: string;
  approvalStatus: StageChangeApprovalStatus;
  approvalStatusName: string;
  createdByUserId: string;
  createdByUserName: string | null;
  reviewedByUserId: string | null;
  reviewedByUserName: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  evidences: StageEvidence[];
  opportunityDetails: OpportunityDetailsPayload | null;
  currentApprovalStage?: string | null;
}
export interface ContractBillOfQuantityItemPayload {
  finishedProductId: number;
  scope: string;
  item: string;
  qty: number;
}

export interface ContractDetailsPayload {
  contractTitle: string;
  contractStartDate: string;
  contractEndDate: string;
  exclusions: string;
  terms: string;
  comment: string;
  billOfQuantity: ContractBillOfQuantityItemPayload[];
}

