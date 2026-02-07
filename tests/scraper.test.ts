import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { extractProducts } from "../src/scraper.js";
import type { SiteConfig } from "../src/config.js";

const testSiteConfig: SiteConfig = {
  url: "",
  baseUrl: "https://www.hermes.com",
  locale: "ja-JP",
  timezone: "Asia/Tokyo",
  selectors: {
    productList: ".product-grid-list-item",
    image: 'img[id^="img-"]',
    title: ".product-title",
    color: ".product-item-colors",
    price: "h-price span",
    link: "a.product-item-name",
  },
  parsing: {
    productCodeAttr: "id",
    productCodeReplace: "img-",
    colorStripPattern: "^,?\\s*カラー\\s*:\\s*",
  },
};

describe("extractProducts", () => {
  it("extracts products from fixture HTML", async () => {
    const fixturePath = resolve(import.meta.dirname, "../fixtures/sample-page.html");
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();
      await page.goto(`file://${fixturePath}`, { waitUntil: "domcontentloaded" });

      const products = await extractProducts(page, testSiteConfig);

      expect(products).toHaveLength(3);

      // First product
      expect(products[0].productCode).toBe("H087971CCAC");
      expect(products[0].name).toBe("バッグ 《エルメス・サボ》");
      expect(products[0].color).toBe("ブラック");
      expect(products[0].price).toBe("￥998,800");
      expect(products[0].priceNumeric).toBe(998800);
      expect(products[0].url).toContain("H087971CCAC");
      expect(products[0].imageUrl).toContain("087971CCAC");

      // Second product
      expect(products[1].productCode).toBe("H084257CKAB");
      expect(products[1].name).toBe("バッグ 《ボリード1923》 ミニ 《空想の鞍》");
      expect(products[1].color).toBe("マルチカラー");
      expect(products[1].priceNumeric).toBe(3806000);

      // Third product
      expect(products[2].productCode).toBe("H084581CKAA");
      expect(products[2].name).toBe("バッグ 《サック・ア・マリス》");
      expect(products[2].priceNumeric).toBe(2651000);
    } finally {
      await browser.close();
    }
  }, 15000);
});
