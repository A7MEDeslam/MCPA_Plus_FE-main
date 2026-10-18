export interface AssetPurchaseOrderListDto {
  id: number;
  poNumber: string;
  supplierId: number;
  supplierName: string;
  orderDate: string;
  deliveryDate: string | null;
  orderStatus: string;
  status: string;
  notes: string;
  itemsCount: number;
  totalOrderedQty: number;
  totalAmount: number;
  actionByName?: string;
  actionAt?: string;
}

export interface AssetPurchaseOrderItemDetailsDto {
  id: number;
  assetId: number;
  assetAccountNo: string;
  assetName: string;
  orderedQty: number;
  unitPrice: number;
  totalPrice: number;
  receivedQty?: number;
  remainingQty?: number;
}

export interface AssetPurchaseOrderDetailsDto extends AssetPurchaseOrderListDto {
  items: AssetPurchaseOrderItemDetailsDto[];
}

export interface CreateAssetPurchaseOrderItemDto {
  assetId: number;
  orderedQty: number;
  unitPrice: number;
}

export interface CreateAssetPurchaseOrderDto {
  supplierId: number;
  orderDate: string;
  deliveryDate: string | null;
  notes: string;
  items: CreateAssetPurchaseOrderItemDto[];
}

export interface AssetReceiptListDto {
  id: number;
  arNumber: string;
  assetPurchaseOrderId: number;
  poNumber: string;
  warehouseId: number;
  warehouseName: string;
  receiptDate: string;
  receivedBy: string;
  status: string;
  itemsCount: number;
  totalReceivedQty: number;
}

export interface AssetReceiptItemDetailsDto {
  id: number;
  assetPurchaseOrderItemId: number;
  assetAccountNo: string;
  assetName: string;
  receivedQty: number;
}

export interface AssetReceiptDetailsDto extends AssetReceiptListDto {
  items: AssetReceiptItemDetailsDto[];
}

export interface CreateAssetReceiptItemDto {
  assetPurchaseOrderItemId: number;
  receivedQty: number;
}

export interface CreateAssetReceiptDto {
  assetPurchaseOrderId: number;
  warehouseId: number;
  receiptDate: string;
  receivedBy: string;
  items: CreateAssetReceiptItemDto[];
}
