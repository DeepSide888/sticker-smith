export interface Product {
  codebar: string;
  qte: number;
  prix: number;
  designation: string;
  reference: string;
  image?: string;
}

export interface ColumnMapping {
  codebar: string;
  qte: string;
  prix: string;
  designation: string;
  reference: string;
}

export interface LabelSettings {
  labelsPerPage: number;
  labelWidth: number;
  labelHeight: number;
  fontSize: {
    designation: number;
    price: number;
    reference: number;
    quantity: number;
  };
}