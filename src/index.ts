import { config } from "./config.js";
import { scrapeProducts } from "./scraper.js";
import { loadState, saveState } from "./storage.js";
import { diffProducts } from "./diff.js";
import { createNotifiers, notifyAll } from "./notifier/index.js";

async function main(): Promise<void> {
  console.log(`=== ${config.name} ===`);
  console.log(`Time: ${new Date().toLocaleString("ja-JP", { timeZone: config.site.timezone })}`);

  // 1. Load previous state
  const previousState = await loadState();
  console.log(
    previousState
      ? `Previous state: ${previousState.products.length} products (check #${previousState.totalChecks})`
      : "No previous state (first run)",
  );

  // 2. Scrape current products
  const currentProducts = await scrapeProducts(config.site);

  // 3. Compare
  const diff = previousState
    ? diffProducts(previousState.products, currentProducts)
    : diffProducts([], currentProducts); // First run: treat all as new

  if (!diff.hasChanges) {
    console.log("No changes detected");
    await saveState(currentProducts, previousState);
    return;
  }

  // 4. Notify
  console.log(
    previousState
      ? `Changes detected: +${diff.added.length} added, -${diff.removed.length} removed, ~${diff.priceChanged.length} price changed`
      : `First run: ${currentProducts.length} products found`,
  );

  const notifiers = createNotifiers(config);
  await notifyAll(notifiers, diff, currentProducts);

  // 5. Save updated state
  await saveState(currentProducts, previousState);
  console.log("State saved successfully");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
