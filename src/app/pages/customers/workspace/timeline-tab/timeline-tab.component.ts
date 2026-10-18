import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { CustomerStatus } from '../../../../models/customer.models';
import {
  CustomerTimelineEvent,
  CustomerTimelineEventType,
} from '../../../../models/customer-timeline.dto';
import { BadgeComponent, EmptyStateComponent, type Tone } from '../../../../shared/ui';
import { CustomerStage, initialsOf, stageOf } from '../customer-status';
import { TIMELINE_GROUP_LABELS, TimelineGroupId, timelineMeta } from '../timeline-meta';

/** An account with no logged activity for this many days is flagged as stale. */
const STALE_AFTER_DAYS = 14;
const DAY_MS = 86_400_000;
const LONG_DESCRIPTION = 140;

type TimelineFilter = 'all' | TimelineGroupId;

interface TimelineRow {
  key: string;
  event: CustomerTimelineEvent;
  icon: string;
  tone: Tone;
  milestone: boolean;
  badge: string;
  time: string;
  from: CustomerStage | null;
  to: CustomerStage | null;
  group: TimelineGroupId;
  actorInitials: string;
  longDescription: boolean;
}

interface TimelineDay {
  key: string;
  label: string;
  rows: TimelineRow[];
}

interface Insight {
  label: string;
  value: string;
  caption: string;
  stale: boolean;
}

const timeFormat = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' });
const dayFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });

function timestamp(value: unknown): number {
  const t = new Date(value as string).getTime();
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
}

function daysSince(value: unknown, now: number): number | null {
  const t = timestamp(value);
  return Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / DAY_MS)) : null;
}

function ago(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function duration(days: number): string {
  if (days === 0) return 'Today';
  return days === 1 ? '1 day' : `${days} days`;
}

function dayInfo(value: unknown): { key: string; label: string; time: string } {
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return { key: 'unknown', label: 'Earlier', time: '' };

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const label =
    date.toDateString() === today.toDateString()
      ? 'Today'
      : date.toDateString() === yesterday.toDateString()
        ? 'Yesterday'
        : dayFormat.format(date);

  return {
    key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
    label,
    time: timeFormat.format(date),
  };
}

/**
 * Timeline tab: insights, filters, and events grouped by day.
 *
 *   @if (workspaceTab === 'timeline') {
 *     <app-timeline-tab
 *       [events]="customerTimeline()"
 *       [loading]="timelineLoading()"
 *       [canManage]="canManage"
 *       (addActivity)="addActivity(customer)" />
 *   }
 */
@Component({
  selector: 'app-timeline-tab',
  imports: [BadgeComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline-tab.component.html',
  styleUrl: './timeline-tab.component.css',
})
export class TimelineTabComponent {
  readonly events = input.required<readonly CustomerTimelineEvent[]>();
  readonly loading = input(false);
  readonly canManage = input(false);

  readonly addActivity = output<void>();

  protected readonly filter = signal<TimelineFilter>('all');
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());
  protected readonly skeletons = [0, 1, 2, 3];

  /** Newest first, with everything the template needs already resolved. */
  private readonly rows = computed<TimelineRow[]>(() =>
    [...this.events()]
      .sort((a, b) => timestamp(b.occurredAt) - timestamp(a.occurredAt))
      .map((event, index) => {
        const meta = timelineMeta(event.type);
        const hasTransition = !!event.fromStatus && !!event.toStatus;
        return {
          key: `${event.occurredAt}|${event.type}|${index}`,
          event,
          icon: meta.icon,
          tone: meta.tone,
          milestone: meta.milestone,
          badge: event.status || meta.label,
          time: dayInfo(event.occurredAt).time,
          from: hasTransition ? stageOf(event.fromStatus as CustomerStatus) : null,
          to: hasTransition ? stageOf(event.toStatus as CustomerStatus) : null,
          group: meta.group,
          actorInitials: event.actorName ? initialsOf(event.actorName) : '',
          longDescription: (event.description?.length ?? 0) > LONG_DESCRIPTION,
        };
      }),
  );

  /** The three numbers a salesperson wants before reading the log. */
  protected readonly insights = computed<Insight[]>(() => {
    const rows = this.rows();
    const now = Date.now();

    const lastActivity = rows.find((r) => r.event.type === CustomerTimelineEventType.Activity);
    const lastActivityDays = lastActivity ? daysSince(lastActivity.event.occurredAt, now) : null;

    const stageEvent =
      rows.find((r) => r.event.type === CustomerTimelineEventType.StageChangeApproved) ??
      rows.find((r) => r.event.type === CustomerTimelineEventType.CustomerCreated);
    const stageDays = stageEvent ? daysSince(stageEvent.event.occurredAt, now) : null;
    const inStage =
      stageEvent?.event.type === CustomerTimelineEventType.StageChangeApproved && stageEvent.to
        ? `In ${stageEvent.to.label}`
        : 'Since the account was created';

    const recentActivities = rows.filter(
      (r) =>
        r.event.type === CustomerTimelineEventType.Activity &&
        (daysSince(r.event.occurredAt, now) ?? Infinity) <= 30,
    ).length;

    return [
      {
        label: 'Time in current stage',
        value: stageDays === null ? '-' : duration(stageDays),
        caption: stageEvent ? inStage : 'No stage history yet',
        stale: false,
      },
      {
        label: 'Last touch',
        value: lastActivityDays === null ? 'None yet' : ago(lastActivityDays),
        caption: lastActivity ? lastActivity.event.title : 'Log a call, email or meeting',
        stale: lastActivityDays === null || lastActivityDays > STALE_AFTER_DAYS,
      },
      {
        label: 'Activities, last 30 days',
        value: String(recentActivities),
        caption: recentActivities === 1 ? 'activity logged' : 'activities logged',
        stale: false,
      },
    ];
  });

  protected readonly chips = computed(() => {
    const rows = this.rows();
    const counts = new Map<TimelineGroupId, number>();
    for (const row of rows) counts.set(row.group, (counts.get(row.group) ?? 0) + 1);

    const chips: { id: TimelineFilter; label: string; count: number }[] = [
      { id: 'all', label: 'All', count: rows.length },
    ];
    for (const id of Object.keys(TIMELINE_GROUP_LABELS) as TimelineGroupId[]) {
      const count = counts.get(id) ?? 0;
      if (count) chips.push({ id, label: TIMELINE_GROUP_LABELS[id], count });
    }
    return chips;
  });

  /** Falls back to "all" when the chosen filter has no events (e.g. after switching customer). */
  protected readonly activeFilter = computed<TimelineFilter>(() => {
    const current = this.filter();
    return this.chips().some((chip) => chip.id === current) ? current : 'all';
  });

  protected readonly days = computed<TimelineDay[]>(() => {
    const filter = this.activeFilter();
    const days: TimelineDay[] = [];
    for (const row of this.rows()) {
      if (filter !== 'all' && row.group !== filter) continue;
      const { key, label } = dayInfo(row.event.occurredAt);
      const last = days[days.length - 1];
      if (last && last.key === key) last.rows.push(row);
      else days.push({ key, label, rows: [row] });
    }
    return days;
  });

  protected toggle(key: string): void {
    this.expanded.update((set) => {
      const next = new Set(set);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }
}
