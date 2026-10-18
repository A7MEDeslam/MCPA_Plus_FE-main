export type SalesActivityKind = 'lead' | 'opportunity';

export interface SalesActivity {
  id: number;
  customerId: number;
  customerName: string;
  activityType: number;
  activityTypeName: string;
  subject: string;
  notes: string | null;
  activityDate: string;
  nextFollowUpDate: string | null;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesActivityListItem extends SalesActivity {
  kind: SalesActivityKind;
}

export interface CreateSalesActivityPayload {
  customerId: number;
  activityType: number;
  subject: string;
  activityDate: string;
  notes?: string;
  nextFollowUpDate?: string;
}

export type UpdateSalesActivityPayload = Omit<CreateSalesActivityPayload, 'customerId'>;

export interface SalesActivityFilters {
  customerId?: number;
  createdByUserId?: string;
}
