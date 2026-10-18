import { CustomerStatus } from '../../../models/customer.models';
import type { Tone } from '../../../shared/ui';

export type StageGroup = 'prospect' | 'deal' | 'won';

export interface CustomerStage {
  value: CustomerStatus;
  label: string;
  tone: Tone;
  group: StageGroup;
}

/** Ordered pipeline. Single source for labels, badge tones and rail filters. */
export const CUSTOMER_STAGES: readonly CustomerStage[] = [
  { value: CustomerStatus.Customer, label: 'Customer', tone: 'neutral', group: 'prospect' },
  { value: CustomerStatus.Contact, label: 'Contact', tone: 'neutral', group: 'prospect' },
  { value: CustomerStatus.Lead, label: 'Lead', tone: 'warning', group: 'prospect' },
  { value: CustomerStatus.Qualified, label: 'Qualified', tone: 'warning', group: 'prospect' },
  { value: CustomerStatus.Opportunity, label: 'Opportunity', tone: 'info', group: 'deal' },
  { value: CustomerStatus.PocOrPilot, label: 'POC or Pilot', tone: 'violet', group: 'deal' },
  { value: CustomerStatus.Negotiation, label: 'Negotiation', tone: 'orange', group: 'deal' },
  { value: CustomerStatus.Contracted, label: 'Contracted', tone: 'success', group: 'won' },
];

export function stageOf(status: CustomerStatus): CustomerStage {
  return (
    CUSTOMER_STAGES.find((stage) => stage.value === status) ?? {
      value: status,
      label: 'Unknown',
      tone: 'neutral',
      group: 'prospect',
    }
  );
}

/** 0-based position in the pipeline (what <app-stage-track [current]> expects). */
export function stageIndexOf(status: CustomerStatus): number {
  return Math.max(
    0,
    CUSTOMER_STAGES.findIndex((stage) => stage.value === status),
  );
}

export function initialsOf(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}