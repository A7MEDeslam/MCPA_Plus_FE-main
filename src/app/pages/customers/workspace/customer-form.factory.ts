import { CustomerStatus, SalesActivityType } from '../../../models/customer.models';
import {
  OpportunityCategory,
  OpportunityPriority,
  QualificationEvidenceType,
} from '../../../models/customer-stage-change-request.dto';
import type {
  CustomerActivityForm,
  CustomerContactForm,
  CustomerForm,
  StageUpgradeContractForm,
  StageUpgradeEvidenceForm,
  StageUpgradeForm,
  StageUpgradePilotForm,
  SubContractForm,
} from './customer-forms.types';

export function createCustomerForm(): CustomerForm {
  return {
    id: null,
    companyName: '',
    location: '',
    region: '',
    country: '',
    city: '',
    website: '',
    phoneNumber: '',
    email: '',
    industryTypeId: 0,
    notes: '',
  };
}

export function createCustomerActivityForm(): CustomerActivityForm {
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

  return {
    activityType: SalesActivityType.Call,
    subject: '',
    notes: '',
    activityDate: localNow,
    nextFollowUpDate: '',
  };
}

export function createCustomerContactForm(): CustomerContactForm {
  return {
    name: '',
    jobTitle: '',
    department: '',
    phoneNumber: '',
    alternativePhoneNumber: '',
    email: '',
    isPrimary: false,
    influence: null,
    dealRole: null,
    businessCard: null,
    notes: '',
  };
}

export function createSubContractForm(): SubContractForm {
  return {
    contractTitle: '',
    contractStartDate: '',
    contractEndDate: '',
    exclusions: '',
    terms: '',
    comments: '',
    resources: [{ scope: '', item: '', qty: null }],
  };
}

export function createStageUpgradeContractForm(): StageUpgradeContractForm {
  return {
    contractTitle: '',
    contractStartDate: '',
    contractEndDate: '',
    exclusions: '',
    terms: '',
    comment: '',
    resources: [{ scope: '', finishedProductId: null, qty: null }],
  };
}

export function createStageUpgradePilotForm(): StageUpgradePilotForm {
  return {
    pilotTitle: '',
    pilotType: null,
    plannedStart: '',
    plannedEnd: '',
    technicalOwnerId: '',
    objective: '',
    successCriteria: '',
    resources: [{ scope: '', finishedProductId: null, qty: null }],
  };
}

export function createStageUpgradeForm(toStatus: CustomerStatus | null): StageUpgradeForm {
  return {
    toStatus,
    upgradeReason: '',
    targetDecisionDate: '',
    evidences: createStageUpgradeEvidenceForms(toStatus),
    opportunityDetails: {
      opportunityValue: null,
      winProbability: null,
      expectedCloseDate: '',
      category: OpportunityCategory.IndustrialAutomation,
      priority: OpportunityPriority.Strategic,
      businessNeed: '',
    },
    pilotDetails: createStageUpgradePilotForm(),
    contractDetails: createStageUpgradeContractForm(),
  };
}

function createStageUpgradeEvidenceForms(
  toStatus: CustomerStatus | null,
): StageUpgradeEvidenceForm[] {
  if (toStatus === CustomerStatus.Contact) {
    return [createEvidence(QualificationEvidenceType.DecisionMakerIdentified, 'Decision maker identified')];
  }

  if (toStatus === CustomerStatus.Qualified) {
    return [
      createEvidence(QualificationEvidenceType.BusinessProblemValidated, 'Business problem validated'),
      createEvidence(QualificationEvidenceType.BudgetRangeConfirmed, 'Budget range confirmed'),
      createEvidence(QualificationEvidenceType.TargetTimelineConfirmed, 'Target timeline confirmed'),
      createEvidence(QualificationEvidenceType.TechnicalFeasibilityReviewed, 'Technical feasibility reviewed'),
      createEvidence(QualificationEvidenceType.ProcurementProcessDocumented, 'Procurement process documented'),
    ];
  }

  return [];
}

function createEvidence(evidenceType: number, label: string): StageUpgradeEvidenceForm {
  return { evidenceType, label, isCompleted: false, details: '' };
}
