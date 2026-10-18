import { CustomerTimelineEventType } from '../../../models/customer-timeline.dto';
import type { Tone } from '../../../shared/ui';

export type TimelineGroupId = 'stage' | 'activity' | 'account' | 'contract';

export interface EventMeta {
  label: string;
  icon: string;
  tone: Tone;
  group: TimelineGroupId;
  /** Milestones get a bigger node and an accent on the card; the rest stay quiet. */
  milestone: boolean;
}

/** One table instead of three switches (label, icon, color). Edit events here. */
const META: Partial<Record<CustomerTimelineEventType, EventMeta>> = {
  [CustomerTimelineEventType.CustomerCreated]: {
    label: 'Created',
    icon: 'pi-flag',
    tone: 'primary',
    group: 'account',
    milestone: true,
  },
  [CustomerTimelineEventType.Activity]: {
    label: 'Activity',
    icon: 'pi-comments',
    tone: 'neutral',
    group: 'activity',
    milestone: false,
  },
  [CustomerTimelineEventType.StageChangeRequested]: {
    label: 'Stage request',
    icon: 'pi-send',
    tone: 'warning',
    group: 'stage',
    milestone: false,
  },
  [CustomerTimelineEventType.StageChangeApproved]: {
    label: 'Approved',
    icon: 'pi-check',
    tone: 'success',
    group: 'stage',
    milestone: true,
  },
  [CustomerTimelineEventType.StageChangeRejected]: {
    label: 'Rejected',
    icon: 'pi-times',
    tone: 'danger',
    group: 'stage',
    milestone: true,
  },
  [CustomerTimelineEventType.ContactAdded]: {
    label: 'Contact added',
    icon: 'pi-user-plus',
    tone: 'neutral',
    group: 'account',
    milestone: false,
  },
  [CustomerTimelineEventType.CustomerAssigned]: {
    label: 'Assigned',
    icon: 'pi-user',
    tone: 'neutral',
    group: 'account',
    milestone: false,
  },
  [CustomerTimelineEventType.PocOrPilot]: {
    label: 'POC / Pilot',
    icon: 'pi-cog',
    tone: 'info',
    group: 'stage',
    milestone: true,
  },
  [CustomerTimelineEventType.Contract]: {
    label: 'Contract',
    icon: 'pi-file',
    tone: 'violet',
    group: 'contract',
    milestone: true,
  },
};

const FALLBACK: EventMeta = {
  label: 'Event',
  icon: 'pi-circle',
  tone: 'neutral',
  group: 'account',
  milestone: false,
};

export function timelineMeta(type: CustomerTimelineEventType): EventMeta {
  return META[type] ?? FALLBACK;
}

export const TIMELINE_GROUP_LABELS: Record<TimelineGroupId, string> = {
  stage: 'Stage changes',
  activity: 'Activities',
  account: 'Account',
  contract: 'Contracts',
};
