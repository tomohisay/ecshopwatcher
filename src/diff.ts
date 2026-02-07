import type { Product, DiffResult } from "./types.js";

export function diffProducts(oldProducts: Product[], newProducts: Product[]): DiffResult {
  const oldMap = new Map(oldProducts.map((p) => [p.productCode, p]));
  const newMap = new Map(newProducts.map((p) => [p.productCode, p]));

  const added: Product[] = [];
  const removed: Product[] = [];
  const priceChanged: DiffResult["priceChanged"] = [];

  // Find added products and price changes
  for (const [code, newProduct] of newMap) {
    const oldProduct = oldMap.get(code);
    if (!oldProduct) {
      added.push(newProduct);
    } else if (oldProduct.priceNumeric !== newProduct.priceNumeric) {
      priceChanged.push({
        product: newProduct,
        oldPrice: oldProduct.price,
        newPrice: newProduct.price,
      });
    }
  }

  // Find removed products
  for (const [code, oldProduct] of oldMap) {
    if (!newMap.has(code)) {
      removed.push(oldProduct);
    }
  }

  return {
    added,
    removed,
    priceChanged,
    hasChanges: added.length > 0 || removed.length > 0 || priceChanged.length > 0,
  };
}
