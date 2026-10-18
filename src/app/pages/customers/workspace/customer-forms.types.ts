import type {
  ContactInfluence,
  Customer,
  CustomerUpdatePayload,
  DealRole,
  IndustryType,
  CustomerStatus,
} from '../../../models/customer.models';
import type {
  OpportunityCategory,
  OpportunityPriority,
} from '../../../models/customer-stage-change-request.dto';
import type { PocPilotType } from '../../../models/customer-poc-pilot.dto';

export type CustomerForm = Required<CustomerUpdatePayload> & { id: number | null };

export interface StageUpgradeContractResourceForm {
  scope: string;
  finishedProductId: number | null;
  qty: number | null;
}

export interface StageUpgradeContractForm {
  contractTitle: string;
  contractStartDate: string;
  contractEndDate: string;
  exclusions: string;
  terms: string;
  comment: string;
  resources: StageUpgradeContractResourceForm[];
}

export interface SubContractResourceForm {
  scope: string;
  item: string;
  qty: number | null;
}

export interface SubContractForm {
  contractTitle: string;
  contractStartDate: string;
  contractEndDate: string;
  exclusions: string;
  terms: string;
  comments: string;
  resources: SubContractResourceForm[];
}

export interface CustomerContactForm {
  name: string;
  jobTitle: string;
  department: string;
  phoneNumber: string;
  alternativePhoneNumber: string;
  email: string;
  isPrimary: boolean;
  influence: ContactInfluence | null;
  dealRole: DealRole | null;
  businessCard: File | null;
  notes: string;
}

export type DirectConversionType = 'poc' | 'project';
export type DeleteTarget = { type: 'customer'; item: Customer } | { type: 'industry'; item: IndustryType };

export interface CustomerActivityForm {
  activityType: number;
  subject: string;
  notes: string;
  activityDate: string;
  nextFollowUpDate: string;
}

export interface StageUpgradeEvidenceForm {
  evidenceType: number;
  label: string;
  isCompleted: boolean;
  details: string;
}

export interface StageUpgradeOpportunityForm {
  opportunityValue: number | null;
  winProbability: number | null;
  expectedCloseDate: string;
  category: OpportunityCategory | null;
  priority: OpportunityPriority | null;
  businessNeed: string;
}

export interface StageUpgradePilotResourceForm {
  scope: string;
  finishedProductId: number | null;
  qty: number | null;
}

export interface StageUpgradePilotForm {
  pilotTitle: string;
  pilotType: PocPilotType | null;
  plannedStart: string;
  plannedEnd: string;
  technicalOwnerId: string;
  objective: string;
  successCriteria: string;
  resources: StageUpgradePilotResourceForm[];
}

export interface StageUpgradeForm {
  toStatus: CustomerStatus | null;
  upgradeReason: string;
  targetDecisionDate: string;
  evidences: StageUpgradeEvidenceForm[];
  opportunityDetails: StageUpgradeOpportunityForm;
  pilotDetails: StageUpgradePilotForm;
  contractDetails: StageUpgradeContractForm;
}

export interface ReservedSerialRow {
  id: number;
  serialNumber: string;
  productName: string;
}
