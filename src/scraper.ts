import { chromium, type Page } from "playwright";
import { config, type SiteConfig } from "./config.js";
import type { Product } from "./types.js";

function parsePrice(priceText: string): number {
  return Number(priceText.replace(/[^\d]/g, "")) || 0;
}

export async function extractProducts(page: Page, site: SiteConfig): Promise<Product[]> {
  const { selectors, parsing } = site;
  const items = await page.$$(selectors.productList);
  const products: Product[] = [];
  const colorRegex = new RegExp(parsing.colorStripPattern);

  for (const item of items) {
    const imgEl = await item.$(selectors.image);
    const titleEl = await item.$(selectors.title);
    const colorEl = await item.$(selectors.color);
    const priceEl = await item.$(selectors.price);
    const linkEl = await item.$(selectors.link);

    const attrValue = await imgEl?.getAttribute(parsing.productCodeAttr) ?? "";
    const productCode = attrValue.replace(parsing.productCodeReplace, "");
    const name = (await titleEl?.textContent() ?? "").trim();
    const rawColor = (await colorEl?.textContent() ?? "").trim();
    const color = rawColor.replace(colorRegex, "").trim();
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
      url: href.startsWith("http") ? href : `${site.baseUrl}${href}`,
      imageUrl: imgSrc.startsWith("//") ? `https:${imgSrc}` : imgSrc,
    });
  }

  return products;
}

export async function scrapeProducts(site?: SiteConfig): Promise<Product[]> {
  const siteConfig = site ?? config.site;
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      locale: siteConfig.locale,
      timezoneId: siteConfig.timezone,
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();

    console.log(`Navigating to ${siteConfig.url}...`);
    await page.goto(siteConfig.url, { waitUntil: "networkidle", timeout: 30000 });

    await page.waitForSelector(siteConfig.selectors.productList, { timeout: 15000 });

    const products = await extractProducts(page, siteConfig);
    console.log(`Found ${products.length} products`);

    if (products.length === 0) {
      const snippet = await page.$eval("main", (el) => el.innerHTML.substring(0, 500)).catch(() => "N/A");
      console.error("No products found. HTML snippet:", snippet);
      throw new Error("Scraping failed: 0 products found");
    }

    return products;
  } finally {
    await browser.close();
  }
}
