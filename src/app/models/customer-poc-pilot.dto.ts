import { CustomerStatus } from './customer.models';
export interface PocPilotResourcePayload {
  itemOrService: string;
  quantity: number;
  unitPrice: number;
  days: number;
}

export interface PocPilotResource extends PocPilotResourcePayload {
  id: number;
  total: number;
}


// القيمة الحقيقية اتأكدت: ProofOfConcept = 1, OperationalPilot = 2, TechnicalPilot = 3
export enum PocPilotType {
  ProofOfConcept = 1,
  OperationalPilot = 2,
  TechnicalPilot = 3,
}

export enum PilotApprovalStatus {
  Pending = 1,
  Approved = 2,
  Rejected = 3,
}

// ... باقي الملف زي ما هو، بس استبدلي كل "PilotType" بـ "PocPilotType"
export interface CustomerPocPilotPayload {
  upgradeReason: string;
  targetDecisionDate: string;
  pilotTitle: string;
  pilotType: PocPilotType;
  plannedStart: string;
  plannedEnd: string;
  technicalOwnerId: string;
  customerSponsorContactId: number;
  objective: string;
  successCriteria: string;
  resources: PocPilotResourcePayload[];
}

export interface CustomerPocPilot {
  id: number;
  customerId: number;
  customerName: string;
  stageChangeRequestId: number;
  pilotTitle: string;
  pilotType: PocPilotType;
  pilotTypeName: string;
  plannedStart: string;
  plannedEnd: string;
  technicalOwnerId: string;
  technicalOwnerName: string | null;
  customerSponsorContactId: number;
  customerSponsorContactName: string | null;
  objective: string;
  successCriteria: string;
  approvalStatus: PilotApprovalStatus;
  approvalStatusName: string;
  estimatedPilotTotal: number;
  resources: PocPilotResource[];
  createdAt: string;
}