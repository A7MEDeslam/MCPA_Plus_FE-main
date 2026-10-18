// customer-stage-details.dto.ts

export interface QualificationEvidence {
  evidenceType: number;
  isCompleted: boolean;
  details: string;
}

export interface StageChangeRequestSummary {
  requestId: number;
  fromStatus: number;
  fromStatusName: string;
  toStatus: number;
  toStatusName: string;
  upgradeReason: string;
  targetDecisionDate: string;
  approvedAt: string;
  approvedByName: string | null;
}

export interface CustomerContactSummary {
  id: number;
  customerId: number;
  customerName: string;
  name: string;
  jobTitle: string | null;
  department: string | null;
  phoneNumber: string | null;
  alternativePhoneNumber: string | null;
  email: string | null;
  isPrimary: boolean;
  dealRole: number | null;
  dealRoleName: string | null;
  influence: number | null;
  influenceName: string | null;
  businessCardUrl: string | null;
  notes: string | null;
  createdByUserId: string;
  createdByUserName: string | null;
  createdAt: string;
}

export interface ContactStageDetails {
  contacts: CustomerContactSummary[];
  primaryContact: CustomerContactSummary | null;
  activities: unknown[];
  approvedStageRequest: StageChangeRequestSummary | null;
}

export interface LeadStageDetails {
  upgradeReason: string | null;
  targetDecisionDate: string | null;
  activities: unknown[];
  approvedStageRequest: StageChangeRequestSummary | null;
}

export interface QualifiedStageDetails {
  upgradeReason: string | null;
  targetDecisionDate: string | null;
  completedEvidenceCount: number;
  totalEvidenceCount: number;
  evidences: QualificationEvidence[];
  activities: unknown[];
  approvedStageRequest: StageChangeRequestSummary | null;
}

export interface OpportunityStageDetails {
  opportunityValue: number;
  winProbability: number;
  expectedCloseDate: string;
  category: number;
  categoryName: string;
  priority: number;
  priorityName: string;
  businessNeed: string;
  upgradeReason: string | null;
  targetDecisionDate: string | null;
  approvedStageRequest: StageChangeRequestSummary | null;
}

// ملاحظة: الشكل ده افتراضي بناءً على نمط باقي الستيدجات — عدّليه لو الريسبونس الفعلي مختلف
export interface PocOrPilotStageDetails {
  id?: number;
  pocId?: number;
  statusName?: string | null;
  approvalStatusName?: string | null;
  pilotTitle: string | null;
  pilotType: number | null;
  pilotTypeName: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  technicalOwnerId: string | null;
  technicalOwnerName: string | null;
  objective: string | null;
  successCriteria: string | null;
  billOfQuantity: { id: number; scope: string; item: string; qty: number }[];
  upgradeReason: string | null;
  targetDecisionDate: string | null;
  activities: unknown[];
  approvedStageRequest: StageChangeRequestSummary | null;
}

// ملاحظة: الشكل ده افتراضي كمان — عدّليه لو الريسبونس الفعلي مختلف
export interface NegotiationStageDetails {
  upgradeReason: string | null;
  targetDecisionDate: string | null;
  activities: unknown[];
  approvedStageRequest: StageChangeRequestSummary | null;
}

export interface ContractBillOfQuantityItem {
  id: number;
  scope: string;
  item: string;
  quantity: number;
}

export interface ContractStageDetails {
  contractId: number;
  startedFromStatus: number;
  startedFromStatusName: string;
  contractTitle: string;
  contractStartDate: string;
  contractEndDate: string;
  exclusions: string;
  terms: string;
  comments: string;
  status: number;
  statusName: string;
  billOfQuantity: ContractBillOfQuantityItem[];
}

export interface CustomerStageDetails {
  customerId: number;
  companyName: string;
  currentStatus: number;
  currentStatusName: string;
  assignedToId: string | null;
  assignedToName: string | null;
  contact: ContactStageDetails | null;
  lead: LeadStageDetails | null;
  qualified: QualifiedStageDetails | null;
  opportunity: OpportunityStageDetails | null;
  pocOrPilot: PocOrPilotStageDetails | null;
  negotiation: NegotiationStageDetails | null;
  contract: ContractStageDetails | null;
}
