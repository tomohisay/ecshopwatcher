/**
 * Regression test: YAML config produces identical behavior to the old hardcoded values.
 *
 * Compares:
 *   1. Config values (URL, selectors, parsing, messages) against former hardcodes
 *   2. Scraper output from fixture HTML — old extractProducts vs new extractProducts
 *   3. Console notification text — old formatProduct/buildMessage vs new
 */
import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { chromium, type Page } from "playwright";
import { loadConfig, type SiteConfig, type MessageConfig } from "../src/config.js";
import { extractProducts } from "../src/scraper.js";
import type { Product, DiffResult } from "../src/types.js";

// ── 1. Old hardcoded values (copied verbatim from pre-refactor code) ──

const OLD_TARGET_URL =
  "https://www.hermes.com/jp/ja/category/leather-goods/bags-and-clutches/womens-bags-and-clutches/";
const OLD_BASE_URL = "https://www.hermes.com";
const OLD_SELECTORS = {
  productList: ".product-grid-list-item",
  image: 'img[id^="img-"]',
  title: ".product-title",
  color: ".product-item-colors",
  price: "h-price span",
  link: "a.product-item-name",
};
const OLD_LOCALE = "ja-JP";
const OLD_TIMEZONE = "Asia/Tokyo";

// Old extractProducts logic (inline replica)
function oldExtractProducts(items: {
  productCode: string;
  name: string;
  rawColor: string;
  priceText: string;
  href: string;
  imgSrc: string;
}[]): Product[] {
  return items
    .filter((i) => i.productCode)
    .map((i) => ({
      productCode: i.productCode,
      name: i.name,
      color: i.rawColor.replace(/^,?\s*カラー\s*:\s*/, "").trim(),
      price: i.priceText,
      priceNumeric: Number(i.priceText.replace(/[^\d]/g, "")) || 0,
      url: i.href.startsWith("http") ? i.href : `${OLD_BASE_URL}${i.href}`,
      imageUrl: i.imgSrc.startsWith("//") ? `https:${i.imgSrc}` : i.imgSrc,
    }));
}

// Old console notification builder (inline replica)
function oldFormatProduct(product: Product, index: number): string {
  return [
    `${index}. ${product.name}`,
    `   カラー: ${product.color}`,
    `   価格: ${product.price}`,
    `   ${product.url}`,
  ].join("\n");
}

function oldBuildConsoleLines(diff: DiffResult, currentProducts: Product[], now: string): string[] {
  const lines: string[] = [];
  if (diff.added.length > 0) {
    lines.push(`\n🆕 エルメス新商品通知\n`);
    lines.push(`■ 新規追加 (${diff.added.length}件)`);
    lines.push("━━━━━━━━━━━━\n");
    diff.added.forEach((p, i) => lines.push(oldFormatProduct(p, i + 1) + "\n"));
  }
  if (diff.removed.length > 0) {
    lines.push(`\n🗑️ 掲載終了 (${diff.removed.length}件)`);
    lines.push("━━━━━━━━━━━━\n");
    diff.removed.forEach((p, i) => lines.push(oldFormatProduct(p, i + 1) + "\n"));
  }
  if (diff.priceChanged.length > 0) {
    lines.push(`\n💰 価格変更 (${diff.priceChanged.length}件)`);
    lines.push("━━━━━━━━━━━━\n");
    diff.priceChanged.forEach((change, i) => {
      lines.push(`${i + 1}. ${change.product.name}`);
      lines.push(`   ${change.oldPrice} → ${change.newPrice}`);
      lines.push(`   ${change.product.url}\n`);
    });
  }
  lines.push("━━━━━━━━━━━━");
  lines.push(`確認時刻: ${now}`);
  lines.push(`現在の掲載数: ${currentProducts.length}件`);
  return lines;
}

// New console notification builder using MessageConfig
function newFormatProduct(product: Product, index: number, msg: MessageConfig): string {
  return [
    `${index}. ${product.name}`,
    `   ${msg.colorLabel}: ${product.color}`,
    `   ${msg.priceLabel}: ${product.price}`,
    `   ${product.url}`,
  ].join("\n");
}

function newBuildConsoleLines(
  diff: DiffResult,
  currentProducts: Product[],
  now: string,
  msg: MessageConfig,
): string[] {
  const lines: string[] = [];
  if (diff.added.length > 0) {
    lines.push(`\n🆕 ${msg.header}\n`);
    lines.push(`■ ${msg.added} (${diff.added.length}${msg.countUnit})`);
    lines.push("━━━━━━━━━━━━\n");
    diff.added.forEach((p, i) => lines.push(newFormatProduct(p, i + 1, msg) + "\n"));
  }
  if (diff.removed.length > 0) {
    lines.push(`\n🗑️ ${msg.removed} (${diff.removed.length}${msg.countUnit})`);
    lines.push("━━━━━━━━━━━━\n");
    diff.removed.forEach((p, i) => lines.push(newFormatProduct(p, i + 1, msg) + "\n"));
  }
  if (diff.priceChanged.length > 0) {
    lines.push(`\n💰 ${msg.priceChanged} (${diff.priceChanged.length}${msg.countUnit})`);
    lines.push("━━━━━━━━━━━━\n");
    diff.priceChanged.forEach((change, i) => {
      lines.push(`${i + 1}. ${change.product.name}`);
      lines.push(`   ${change.oldPrice} → ${change.newPrice}`);
      lines.push(`   ${change.product.url}\n`);
    });
  }
  lines.push("━━━━━━━━━━━━");
  lines.push(`${msg.timeLabel}: ${now}`);
  lines.push(`${msg.countLabel}: ${currentProducts.length}${msg.countUnit}`);
  return lines;
}

// ── Tests ──

describe("regression: YAML config matches old hardcoded values", () => {
  const cfg = loadConfig();

  it("site URL matches", () => {
    expect(cfg.site.url).toBe(OLD_TARGET_URL);
  });

  it("baseUrl matches", () => {
    expect(cfg.site.baseUrl).toBe(OLD_BASE_URL);
  });

  it("all CSS selectors match", () => {
    expect(cfg.site.selectors.productList).toBe(OLD_SELECTORS.productList);
    expect(cfg.site.selectors.image).toBe(OLD_SELECTORS.image);
    expect(cfg.site.selectors.title).toBe(OLD_SELECTORS.title);
    expect(cfg.site.selectors.color).toBe(OLD_SELECTORS.color);
    expect(cfg.site.selectors.price).toBe(OLD_SELECTORS.price);
    expect(cfg.site.selectors.link).toBe(OLD_SELECTORS.link);
  });

  it("locale and timezone match", () => {
    expect(cfg.site.locale).toBe(OLD_LOCALE);
    expect(cfg.site.timezone).toBe(OLD_TIMEZONE);
  });

  it("parsing rules match old hardcoded logic", () => {
    expect(cfg.site.parsing.productCodeAttr).toBe("id");
    expect(cfg.site.parsing.productCodeReplace).toBe("img-");
    // Verify the regex pattern produces same results as old inline regex
    const oldRegex = /^,?\s*カラー\s*:\s*/;
    const newRegex = new RegExp(cfg.site.parsing.colorStripPattern);
    const testCases = [
      ", カラー: ブラック",
      "カラー: マルチカラー",
      ",カラー:ゴールド",
      "ブラック", // no prefix
    ];
    for (const tc of testCases) {
      expect(tc.replace(newRegex, "")).toBe(tc.replace(oldRegex, ""));
    }
  });

  it("message strings match old hardcoded Japanese text", () => {
    expect(cfg.messages.header).toBe("エルメス新商品通知");
    expect(cfg.messages.added).toBe("新規追加");
    expect(cfg.messages.removed).toBe("掲載終了");
    expect(cfg.messages.priceChanged).toBe("価格変更");
    expect(cfg.messages.colorLabel).toBe("カラー");
    expect(cfg.messages.priceLabel).toBe("価格");
    expect(cfg.messages.timeLabel).toBe("確認時刻");
    expect(cfg.messages.countLabel).toBe("現在の掲載数");
    expect(cfg.messages.countUnit).toBe("件");
  });

  it("productsFile path matches old convention", () => {
    expect(cfg.productsFile).toBe(resolve(process.cwd(), "data", "products.json"));
  });
});

describe("regression: scraper output identical on fixture HTML", () => {
  it("new extractProducts returns same result as old logic", async () => {
    const fixturePath = resolve(import.meta.dirname, "../fixtures/sample-page.html");
    const cfg = loadConfig();
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();
      await page.goto(`file://${fixturePath}`, { waitUntil: "domcontentloaded" });

      // Extract using new config-driven function
      const newProducts = await extractProducts(page, cfg.site);

      // Extract raw data and run through old logic manually
      const items = await page.$$(OLD_SELECTORS.productList);
      const rawItems = [];
      for (const item of items) {
        const imgEl = await item.$(OLD_SELECTORS.image);
        const titleEl = await item.$(OLD_SELECTORS.title);
        const colorEl = await item.$(OLD_SELECTORS.color);
        const priceEl = await item.$(OLD_SELECTORS.price);
        const linkEl = await item.$(OLD_SELECTORS.link);

        const imgId = (await imgEl?.getAttribute("id")) ?? "";
        rawItems.push({
          productCode: imgId.replace("img-", ""),
          name: ((await titleEl?.textContent()) ?? "").trim(),
          rawColor: ((await colorEl?.textContent()) ?? "").trim(),
          priceText: ((await priceEl?.textContent()) ?? "").trim(),
          href: (await linkEl?.getAttribute("href")) ?? "",
          imgSrc: (await imgEl?.getAttribute("src")) ?? "",
        });
      }
      const oldProducts = oldExtractProducts(rawItems);

      // Compare product-by-product
      expect(newProducts).toHaveLength(oldProducts.length);
      for (let i = 0; i < oldProducts.length; i++) {
        expect(newProducts[i]).toEqual(oldProducts[i]);
      }
    } finally {
      await browser.close();
    }
  }, 15000);
});

describe("regression: notification text identical", () => {
  const cfg = loadConfig();
  const fixedNow = "2026/2/8 12:00:00";

  const sampleProducts: Product[] = [
    {
      productCode: "H001",
      name: "バッグ 《テスト》",
      color: "ブラック",
      price: "￥100,000",
      priceNumeric: 100000,
      url: "https://www.hermes.com/jp/ja/product/H001",
      imageUrl: "https://assets.hermes.com/H001.jpg",
    },
    {
      productCode: "H002",
      name: "バッグ 《テスト2》",
      color: "ゴールド",
      price: "￥200,000",
      priceNumeric: 200000,
      url: "https://www.hermes.com/jp/ja/product/H002",
      imageUrl: "https://assets.hermes.com/H002.jpg",
    },
  ];

  it("added notification text matches", () => {
    const diff: DiffResult = {
      added: sampleProducts,
      removed: [],
      priceChanged: [],
      hasChanges: true,
    };
    const oldLines = oldBuildConsoleLines(diff, sampleProducts, fixedNow);
    const newLines = newBuildConsoleLines(diff, sampleProducts, fixedNow, cfg.messages);
    expect(newLines).toEqual(oldLines);
  });

  it("removed notification text matches", () => {
    const diff: DiffResult = {
      added: [],
      removed: sampleProducts,
      priceChanged: [],
      hasChanges: true,
    };
    const oldLines = oldBuildConsoleLines(diff, [], fixedNow);
    const newLines = newBuildConsoleLines(diff, [], fixedNow, cfg.messages);
    expect(newLines).toEqual(oldLines);
  });

  it("price changed notification text matches", () => {
    const diff: DiffResult = {
      added: [],
      removed: [],
      priceChanged: [
        { product: sampleProducts[0], oldPrice: "￥90,000", newPrice: "￥100,000" },
      ],
      hasChanges: true,
    };
    const oldLines = oldBuildConsoleLines(diff, sampleProducts, fixedNow);
    const newLines = newBuildConsoleLines(diff, sampleProducts, fixedNow, cfg.messages);
    expect(newLines).toEqual(oldLines);
  });

  it("mixed changes notification text matches", () => {
    const diff: DiffResult = {
      added: [sampleProducts[0]],
      removed: [sampleProducts[1]],
      priceChanged: [
        { product: sampleProducts[0], oldPrice: "￥90,000", newPrice: "￥100,000" },
      ],
      hasChanges: true,
    };
    const oldLines = oldBuildConsoleLines(diff, sampleProducts, fixedNow);
    const newLines = newBuildConsoleLines(diff, sampleProducts, fixedNow, cfg.messages);
    expect(newLines).toEqual(oldLines);
  });
});
