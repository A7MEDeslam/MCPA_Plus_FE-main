// src/app/models/semi-finished.model.ts

export interface SemiFinished {
  id: number;
  code: string;
  name: string;
  modelType: string;
  currentStock: number;
  totalProduced: number;
  lastProductionDate: string | null;
}

export interface SemiFinishedCreate {
  name: string;
  modelType: string;
  currentStock: number;
}

// PUT payload shape matches POST per the Swagger schema you shared
export type SemiFinishedUpdate = SemiFinishedCreate;

export interface ProduceRequest {
  semiFinishedId: number;
  quantity: number;
}

export interface AssignRequest {
  semiFinishedId: number;
  quantity: number;
  projectId: number;
  engineerId: string | null;
  notes: string;
}

export interface SemiFinishedAssignment {
  id: number;
  semiFinishedId: number;
  semiFinishedCode: string;
  semiFinishedName: string;
  quantity: number;
  projectId: number;
  projectName: string;
  engineerId: string | null;
  engineerName: string | null;
  assignedAt: string;
  assignedBy: string;
  notes: string;
}

export interface Engineer {
  id: string;
  name: string;
}
