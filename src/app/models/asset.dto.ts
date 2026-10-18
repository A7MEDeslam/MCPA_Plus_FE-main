export interface AssetDto {
  id: number;
  accountNo: string;
  name: string;
  level: number;
  isActive: boolean;
  parentId: number | null;
  parentName: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface AssetTreeDto {
  id: number;
  accountNo: string;
  name: string;
  level: number;
  isActive: boolean;
  children: AssetTreeDto[];
}

export interface CreateAssetDto {
  accountNo: string;
  name: string;
  parentId: number | null;
}

export interface UpdateAssetDto {
  accountNo: string;
  name: string;
  isActive: boolean;
  parentId: number | null;
}
