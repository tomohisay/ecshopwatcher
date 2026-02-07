import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { config } from "./config.js";
import type { StoredState, Product } from "./types.js";

export async function loadState(productsFile?: string): Promise<StoredState | null> {
  try {
    const data = await readFile(productsFile ?? config.productsFile, "utf-8");
    return JSON.parse(data) as StoredState;
  } catch {
    return null;
  }
}

export async function saveState(
  products: Product[],
  previousState: StoredState | null,
  productsFile?: string,
): Promise<void> {
  const filePath = productsFile ?? config.productsFile;
  const state: StoredState = {
    lastChecked: new Date().toISOString(),
    products,
    totalChecks: (previousState?.totalChecks ?? 0) + 1,
  };

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
}
