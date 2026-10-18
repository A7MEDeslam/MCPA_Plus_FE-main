export interface SpareReturnDto {
  warehouseId: number;
  rawMaterialId: number;
  quantity: number;
  projectId: number;
  notes?: string;
}

export interface SpareReturnResultDto {
  id: number;
  warehouseName: string;
  materialName: string;
  materialCode: string;
  quantityIn: number;
  balanceAfter: number;
  projectId: number;
  returnedAt: string;
  notes?: string;
}
