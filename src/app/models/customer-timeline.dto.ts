export enum CustomerTimelineEventType {
  CustomerCreated = 1,
  Activity = 2,
  StageChangeRequested = 3,
  StageChangeApproved = 4,
  StageChangeRejected = 5,
  ContactAdded = 6,
  CustomerAssigned = 7,
  PocOrPilot = 8,
  Contract = 9,
}

export interface CustomerTimelineEvent {
  type: CustomerTimelineEventType;
  title: string;
  description: string | null;
  occurredAt: string;
  actorUserId: string | null;
  actorName: string | null;
  fromStatus: number | null;
  toStatus: number | null;
  status: string | null;
  referenceId: number;
}
