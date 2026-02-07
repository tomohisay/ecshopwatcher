export interface Product {
  productCode: string;   // e.g. "H087971CCAC"
  name: string;          // e.g. "バッグ 《エルメス・サボ》"
  color: string;         // e.g. "ブラック"
  price: string;         // e.g. "￥998,800"
  priceNumeric: number;  // e.g. 998800
  url: string;           // full URL
  imageUrl: string;      // product image URL
}

export interface StoredState {
  lastChecked: string;   // ISO 8601
  products: Product[];
  totalChecks: number;
}

export interface DiffResult {
  added: Product[];
  removed: Product[];
  priceChanged: Array<{
    product: Product;
    oldPrice: string;
    newPrice: string;
  }>;
  hasChanges: boolean;
}

export interface Notifier {
  notify(diff: DiffResult, currentProducts: Product[]): Promise<void>;
}

export interface Config {
  targetUrl: string;
  lineChannelAccessToken: string | undefined;
  lineTargetUserId: string | undefined;
  dataDir: string;
  productsFile: string;
}
