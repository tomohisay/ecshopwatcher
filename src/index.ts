import { scrapeProducts } from "./scraper.js";
import { loadState, saveState } from "./storage.js";
import { diffProducts } from "./diff.js";
import { createNotifiers, notifyAll } from "./notifier/index.js";

async function main(): Promise<void> {
  console.log("=== Hermes Watcher ===");
  console.log(`Time: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`);

  // 1. Load previous state
  const previousState = await loadState();
  console.log(
    previousState
      ? `Previous state: ${previousState.products.length} products (check #${previousState.totalChecks})`
      : "No previous state (first run)",
  );

  // 2. Scrape current products
  const currentProducts = await scrapeProducts();

  // 3. Compare
  if (!previousState) {
    // First run: save current products without notification
    console.log("First run - saving initial product list without notification");
    await saveState(currentProducts, null);
    console.log(`Saved ${currentProducts.length} products`);
    return;
  }

  const diff = diffProducts(previousState.products, currentProducts);

  if (!diff.hasChanges) {
    console.log("No changes detected");
    await saveState(currentProducts, previousState);
    return;
  }

  // 4. Notify
  console.log(
    `Changes detected: +${diff.added.length} added, -${diff.removed.length} removed, ~${diff.priceChanged.length} price changed`,
  );

  const notifiers = createNotifiers();
  await notifyAll(notifiers, diff, currentProducts);

  // 5. Save updated state
  await saveState(currentProducts, previousState);
  console.log("State saved successfully");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
