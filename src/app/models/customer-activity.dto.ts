import { CustomerStatus, SalesActivityType } from './customer.models';

export interface CustomerActivity {
  id: number;
  customerId: number;
  customerName: string;
  activityType: SalesActivityType;
  activityTypeName: string;
  subject: string;
  notes: string | null;
  activityDate: string;
  nextFollowUpDate: string | null;
  customerStatus: CustomerStatus;
  customerStatusName: string;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  updatedByUserId: string | null;
  updatedByUserName: string | null;
  updatedAt: string | null;
}

export interface CustomerActivityPayload {
  customerId: number;
  activityType: SalesActivityType;
  subject: string;
  notes?: string;
  activityDate: string;
  nextFollowUpDate?: string;
}

export interface CustomerActivityUpdatePayload {
  activityType: SalesActivityType;
  subject: string;
  notes?: string;
  activityDate: string;
  nextFollowUpDate?: string;
}
