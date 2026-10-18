import { Customer, CustomerStatus } from '../../../models/customer.models';
import { CustomerStageDetails } from '../../../models/customer-stage-details.dto';
import { QualificationEvidenceType } from '../../../models/customer-stage-change-request.dto';

export interface SummaryField {
  label: string;
  value: string;
}

export interface SummaryHighlight {
  label: string;
  value: string;
  /** 0-100, draws a meter under the value. */
  progress: number | null;
}

export interface SummaryNote {
  label: string;
  text: string;
}

export interface SummaryEvidence {
  label: string;
  details: string;
  done: boolean;
}

export interface StageSummary {
  /** false for stages that only show the account card (Customer, Contracted). */
  applicable: boolean;
  /** stage expects details but the backend returned none. */
  missing: boolean;
  highlights: SummaryHighlight[];
  fields: SummaryField[];
  notes: SummaryNote[];
  evidences: SummaryEvidence[];
  evidenceProgress: { done: number; total: number } | null;
  approvedTransition: string | null;
}

// ---------- formatting ----------

const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });
const numberFormat = new Intl.NumberFormat('en');

export function formatDate(value: unknown): string {
  if (!value) return '-';
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? '-' : dateFormat.format(date);
}

function formatNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  const n = Number(value);
  return Number.isNaN(n) ? '-' : numberFormat.format(n);
}

function text(value: unknown, fallback = '-'): string {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s || fallback;
}

function evidenceLabel(type: QualificationEvidenceType): string {
  switch (type) {
    case QualificationEvidenceType.DecisionMakerIdentified:
      return 'Decision maker identified';
    case QualificationEvidenceType.BusinessProblemValidated:
      return 'Business problem validated';
    case QualificationEvidenceType.BudgetRangeConfirmed:
      return 'Budget range confirmed';
    case QualificationEvidenceType.TargetTimelineConfirmed:
      return 'Target timeline confirmed';
    case QualificationEvidenceType.TechnicalFeasibilityReviewed:
      return 'Technical feasibility reviewed';
    case QualificationEvidenceType.ProcurementProcessDocumented:
      return 'Procurement process documented';
    default:
      return 'Evidence';
  }
}

// ---------- summary per stage ----------

// The backend sections are loosely typed (some are read with index access in the old
// template), so they are read through a loose record here instead of fighting the types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Section = Record<string, any> | null | undefined;

const EMPTY: StageSummary = {
  applicable: true,
  missing: false,
  highlights: [],
  fields: [],
  notes: [],
  evidences: [],
  evidenceProgress: null,
  approvedTransition: null,
};

export function buildStageSummary(
  customer: Customer,
  details: CustomerStageDetails | null,
): StageSummary {
  const d = (details ?? {}) as unknown as Record<string, Section>;

  switch (customer.status) {
    case CustomerStatus.Contact: {
      const s = d['contact'];
      if (!s) return { ...EMPTY, missing: true };
      const req = s['approvedStageRequest'];
      return {
        ...EMPTY,
        fields: [
          { label: 'Primary contact', value: text(s['primaryContact']?.name, 'Not set yet') },
          { label: 'Contacts on file', value: String(s['contacts']?.length ?? 0) },
        ],
        approvedTransition: req
          ? `${req.fromStatusName} to ${req.toStatusName} on ${formatDate(req.approvedAt)}`
          : null,
      };
    }

    case CustomerStatus.Lead: {
      const s = d['lead'];
      if (!s) return { ...EMPTY, missing: true };
      return {
        ...EMPTY,
        fields: [{ label: 'Target decision date', value: formatDate(s['targetDecisionDate']) }],
        notes: [{ label: 'Upgrade reason', text: text(s['upgradeReason']) }],
      };
    }

    case CustomerStatus.Qualified: {
      const s = d['qualified'];
      if (!s) return { ...EMPTY, missing: true };
      const evidences: SummaryEvidence[] = (s['evidences'] ?? []).map(
        (e: {
          evidenceType: QualificationEvidenceType;
          details?: string;
          isCompleted?: boolean;
        }) => ({
          label: evidenceLabel(e.evidenceType),
          details: text(e.details, 'No details yet'),
          done: !!e.isCompleted,
        }),
      );
      return {
        ...EMPTY,
        fields: [{ label: 'Target decision date', value: formatDate(s['targetDecisionDate']) }],
        evidences,
        evidenceProgress: {
          done: Number(s['completedEvidenceCount'] ?? evidences.filter((e) => e.done).length),
          total: Number(s['totalEvidenceCount'] ?? evidences.length),
        },
      };
    }

    case CustomerStatus.Opportunity: {
      const s = d['opportunity'];
      if (!s) return { ...EMPTY, missing: true };
      const probability = Math.min(100, Math.max(0, Number(s['winProbability']) || 0));
      return {
        ...EMPTY,
        highlights: [
          {
            label: 'Opportunity value',
            value: formatNumber(s['opportunityValue']),
            progress: null,
          },
          { label: 'Win probability', value: `${probability}%`, progress: probability },
        ],
        fields: [
          { label: 'Expected close', value: formatDate(s['expectedCloseDate']) },
          { label: 'Category', value: text(s['categoryName']) },
          { label: 'Priority', value: text(s['priorityName']) },
          { label: 'Target decision date', value: formatDate(s['targetDecisionDate']) },
        ],
        notes: [{ label: 'Business need', text: text(s['businessNeed']) }],
      };
    }

    case CustomerStatus.PocOrPilot: {
      const s = d['pocOrPilot'];
      if (!s) return { ...EMPTY, missing: true };
      return {
        ...EMPTY,
        fields: [
          { label: 'Pilot title', value: text(s['pilotTitle']) },
          { label: 'Pilot type', value: text(s['pilotTypeName']) },
          { label: 'Planned start', value: formatDate(s['plannedStart']) },
          { label: 'Planned end', value: formatDate(s['plannedEnd']) },
          { label: 'Technical owner', value: text(s['technicalOwnerName']) },
        ],
        notes: [
          { label: 'Objective', text: text(s['objective']) },
          { label: 'Success criteria', text: text(s['successCriteria']) },
        ],
      };
    }

    case CustomerStatus.Negotiation: {
      const s = d['negotiation'];
      if (!s) return { ...EMPTY, missing: true };
      return {
        ...EMPTY,
        fields: [{ label: 'Target decision date', value: formatDate(s['targetDecisionDate']) }],
        notes: [{ label: 'Upgrade reason', text: text(s['upgradeReason']) }],
      };
    }

    default:
      return { ...EMPTY, applicable: false };
  }
}

// ---------- "what to do next" ----------

export interface SuggestedFocus {
  title: string;
  text: string;
}

/** One place to edit the guidance text shown in the side card. */
export function suggestedFocus(status: CustomerStatus, hasPending: boolean): SuggestedFocus {
  if (hasPending) {
    return {
      title: 'Waiting for approval',
      text: 'A new stage request can be made once the pending one is decided.',
    };
  }
  switch (status) {
    case CustomerStatus.Customer:
      return {
        title: 'Identify the right contact',
        text: 'Add the primary contact so the account can move to the Contact stage.',
      };
    case CustomerStatus.Contact:
      return {
        title: 'Turn the contact into a lead',
        text: 'Record the target decision date and why this account is worth pursuing.',
      };
    case CustomerStatus.Lead:
      return {
        title: 'Validate the business problem',
        text: 'Complete the qualification evidence to move to Qualified.',
      };
    case CustomerStatus.Qualified:
      return {
        title: 'Size the opportunity',
        text: 'Estimate the value, win probability and expected close date.',
      };
    case CustomerStatus.Opportunity:
      return {
        title: 'Prepare the pilot scope',
        text: 'Define objective, success criteria and resources, or go straight to a contract.',
      };
    case CustomerStatus.PocOrPilot:
      return {
        title: 'Review the pilot results',
        text: 'Check the success criteria with the customer before negotiating.',
      };
    case CustomerStatus.Negotiation:
      return {
        title: 'Close the terms',
        text: 'Agree scope, dates and the bill of quantity, then request the contract.',
      };
    case CustomerStatus.Contracted:
      return {
        title: 'Track delivery',
        text: 'Manage sub-contracts and warehouse delivery from the tabs above.',
      };
    default:
      return { title: 'Review customer progression', text: 'Keep the account details up to date.' };
  }
}
