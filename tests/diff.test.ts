import { describe, it, expect } from "vitest";
import { diffProducts } from "../src/diff.js";
import type { Product } from "../src/types.js";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    productCode: "H001",
    name: "テストバッグ",
    color: "ブラック",
    price: "￥100,000",
    priceNumeric: 100000,
    url: "https://example.com/product/H001",
    imageUrl: "https://example.com/img/H001.jpg",
    ...overrides,
  };
}

describe("diffProducts", () => {
  it("returns no changes for identical lists", () => {
    const products = [makeProduct()];
    const result = diffProducts(products, products);

    expect(result.hasChanges).toBe(false);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.priceChanged).toHaveLength(0);
  });

  it("detects added products", () => {
    const oldProducts = [makeProduct({ productCode: "H001" })];
    const newProducts = [
      makeProduct({ productCode: "H001" }),
      makeProduct({ productCode: "H002", name: "新しいバッグ" }),
    ];

    const result = diffProducts(oldProducts, newProducts);

    expect(result.hasChanges).toBe(true);
    expect(result.added).toHaveLength(1);
    expect(result.added[0].productCode).toBe("H002");
    expect(result.removed).toHaveLength(0);
  });

  it("detects removed products", () => {
    const oldProducts = [
      makeProduct({ productCode: "H001" }),
      makeProduct({ productCode: "H002" }),
    ];
    const newProducts = [makeProduct({ productCode: "H001" })];

    const result = diffProducts(oldProducts, newProducts);

    expect(result.hasChanges).toBe(true);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].productCode).toBe("H002");
    expect(result.added).toHaveLength(0);
  });

  it("detects price changes", () => {
    const oldProducts = [
      makeProduct({ productCode: "H001", price: "￥100,000", priceNumeric: 100000 }),
    ];
    const newProducts = [
      makeProduct({ productCode: "H001", price: "￥120,000", priceNumeric: 120000 }),
    ];

    const result = diffProducts(oldProducts, newProducts);

    expect(result.hasChanges).toBe(true);
    expect(result.priceChanged).toHaveLength(1);
    expect(result.priceChanged[0].oldPrice).toBe("￥100,000");
    expect(result.priceChanged[0].newPrice).toBe("￥120,000");
  });

  it("handles empty old list (first run scenario)", () => {
    const newProducts = [
      makeProduct({ productCode: "H001" }),
      makeProduct({ productCode: "H002" }),
    ];

    const result = diffProducts([], newProducts);

    expect(result.hasChanges).toBe(true);
    expect(result.added).toHaveLength(2);
    expect(result.removed).toHaveLength(0);
  });

  it("handles empty new list", () => {
    const oldProducts = [makeProduct({ productCode: "H001" })];

    const result = diffProducts(oldProducts, []);

    expect(result.hasChanges).toBe(true);
    expect(result.removed).toHaveLength(1);
    expect(result.added).toHaveLength(0);
  });

  it("detects multiple types of changes simultaneously", () => {
    const oldProducts = [
      makeProduct({ productCode: "H001", price: "￥100,000", priceNumeric: 100000 }),
      makeProduct({ productCode: "H002" }),
    ];
    const newProducts = [
      makeProduct({ productCode: "H001", price: "￥110,000", priceNumeric: 110000 }),
      makeProduct({ productCode: "H003", name: "新商品" }),
    ];

    const result = diffProducts(oldProducts, newProducts);

    expect(result.hasChanges).toBe(true);
    expect(result.added).toHaveLength(1);
    expect(result.added[0].productCode).toBe("H003");
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].productCode).toBe("H002");
    expect(result.priceChanged).toHaveLength(1);
    expect(result.priceChanged[0].product.productCode).toBe("H001");
  });
});
