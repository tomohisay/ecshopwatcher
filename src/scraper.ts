import { chromium, type Page } from "playwright";
import { config } from "./config.js";
import type { Product } from "./types.js";

const BASE_URL = "https://www.hermes.com";

function parsePrice(priceText: string): number {
  return Number(priceText.replace(/[^\d]/g, "")) || 0;
}

export async function extractProducts(page: Page): Promise<Product[]> {
  const items = await page.$$(".product-grid-list-item");
  const products: Product[] = [];

  for (const item of items) {
    const imgEl = await item.$('img[id^="img-"]');
    const titleEl = await item.$(".product-title");
    const colorEl = await item.$(".product-item-colors");
    const priceEl = await item.$("h-price span");
    const linkEl = await item.$("a.product-item-name");

    const imgId = await imgEl?.getAttribute("id") ?? "";
    const productCode = imgId.replace("img-", "");
    const name = (await titleEl?.textContent() ?? "").trim();
    const rawColor = (await colorEl?.textContent() ?? "").trim();
    const color = rawColor.replace(/^,?\s*カラー\s*:\s*/, "").trim();
    const priceText = (await priceEl?.textContent() ?? "").trim();
    const href = await linkEl?.getAttribute("href") ?? "";
    const imgSrc = await imgEl?.getAttribute("src") ?? "";

    if (!productCode) continue;

    products.push({
      productCode,
      name,
      color,
      price: priceText,
      priceNumeric: parsePrice(priceText),
      url: href.startsWith("http") ? href : `${BASE_URL}${href}`,
      imageUrl: imgSrc.startsWith("//") ? `https:${imgSrc}` : imgSrc,
    });
  }

  return products;
}

export async function scrapeProducts(): Promise<Product[]> {
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      locale: "ja-JP",
      timezoneId: "Asia/Tokyo",
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();

    console.log(`Navigating to ${config.targetUrl}...`);
    await page.goto(config.targetUrl, { waitUntil: "networkidle", timeout: 30000 });

    // Wait for product grid to appear
    await page.waitForSelector(".product-grid-list-item", { timeout: 15000 });

    const products = await extractProducts(page);
    console.log(`Found ${products.length} products`);

    if (products.length === 0) {
      // Log HTML snippet for debugging
      const snippet = await page.$eval("main", (el) => el.innerHTML.substring(0, 500)).catch(() => "N/A");
      console.error("No products found. HTML snippet:", snippet);
      throw new Error("Scraping failed: 0 products found");
    }

    return products;
  } finally {
    await browser.close();
  }
}
