export interface MaterialRow {
  id: string;
  materialId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unit: string;
}

export interface LineItem {
  id: string;
  description: string;
  laborPrice: number;
  includeVat: boolean;
  materials: MaterialRow[];
}
