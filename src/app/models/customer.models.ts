// customer.models.ts

export interface Customer {
  id: number;
  companyName: string;
  location: string | null;
  region: string | null;
  country: string | null;
  website: string | null;
  phoneNumber: string;
  email: string;
  industryTypeId: number;
  industryTypeName: string;
  status: CustomerStatus;
  registrationOrTaxId: string | null;
  notes: string | null;
  createdByUserId: string;
  createdByName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  createdAt: string;
  city?: string;
}

export interface CustomerPayload {
  companyName: string;
  industryTypeId: number;
  location?: string;
  region?: string;
  country?: string;
  website?: string;
  phoneNumber?: string;
  email?: string;
  notes?: string;
  city?: string;
}

export type CustomerUpdatePayload = CustomerPayload;

export interface CustomerAssignPayload {
  assignedToId: string;
}

export interface SalesUser {
  userId: string;
  userName: string;
}

export interface CustomerConversionPayload {
  reason: string;
}

export interface CustomerProjectConversionResult {
  id: number;
  name: string;
  customerId: number;
  customerName: string;
  status: number;
  statusName: string;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  updatedAt: string;
  actionByName: string;
  actionAt: string;
}

export interface IndustryType {
  id: number;
  name: string;
}

export interface IndustryTypePayload {
  name: string;
}

// Mirrors the numeric values returned by the API for the customer pipeline.
export enum CustomerStatus {
  Customer = 1,
  Contact = 2,
  Lead = 3,
  Qualified = 4,
  Opportunity = 5,
  PocOrPilot = 6,
  Negotiation = 7,
  Contracted = 8,
}

export enum ContactInfluence {
  Low = 1,
  Medium = 2,
  High = 3,
}

export enum DealRole {
  DecisionMaker = 1,
  Influencer = 2,
  Champion = 3,
  Gatekeeper = 4,
  EndUser = 5,
  Procurement = 6,
  TechnicalEvaluator = 7,
  Other = 8,
}

export enum SalesActivityType {
  Call = 1,
  Email = 2,
  WhatsApp = 3,
  Meeting = 4,
  SiteVisit = 5,
  Demo = 6,
  Proposal = 7,
  FollowUp = 8,
  Other = 9,
}
export interface CustomerContact {
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
  influence?: ContactInfluence | null;
  dealRole?: DealRole | null;
  influenceName?: string | null;
  dealRoleName?: string | null;
  businessCardUrl?: string | null;
  notes: string | null;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
}

export interface CustomerContactPayload {
  customerId: number;
  name: string;
  jobTitle?: string;
  department?: string;
  phoneNumber?: string;
  alternativePhoneNumber?: string;
  email?: string;
  isPrimary?: boolean;
  influence?: ContactInfluence;
  dealRole?: DealRole;
  businessCard?: File;
  notes?: string;
}

export interface CustomerContactUpdatePayload {
  name: string;
  jobTitle?: string;
  department?: string;
  phoneNumber?: string;
  alternativePhoneNumber?: string;
  email?: string;
  isPrimary?: boolean;
  influence?: ContactInfluence;
  dealRole?: DealRole;
  businessCard?: File;
  notes?: string;
}
