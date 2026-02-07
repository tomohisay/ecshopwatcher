import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFile, rm, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import type { Product, StoredState } from "../src/types.js";

// We need to mock config before importing storage
const testDir = resolve(tmpdir(), `hermeswatcher-test-${Date.now()}`);
const testFile = resolve(testDir, "products.json");

vi.mock("../src/config.js", () => ({
  config: {
    targetUrl: "https://example.com",
    lineChannelAccessToken: undefined,
    lineTargetUserId: undefined,
    dataDir: testDir,
    productsFile: testFile,
  },
}));

const { loadState, saveState } = await import("../src/storage.js");

function makeProduct(code: string): Product {
  return {
    productCode: code,
    name: `テストバッグ ${code}`,
    color: "ブラック",
    price: "￥100,000",
    priceNumeric: 100000,
    url: `https://example.com/product/${code}`,
    imageUrl: `https://example.com/img/${code}.jpg`,
  };
}

describe("storage", () => {
  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("returns null when no file exists", async () => {
    const state = await loadState();
    expect(state).toBeNull();
  });

  it("saves and loads state correctly", async () => {
    const products = [makeProduct("H001"), makeProduct("H002")];

    await saveState(products, null);
    const state = await loadState();

    expect(state).not.toBeNull();
    expect(state!.products).toHaveLength(2);
    expect(state!.products[0].productCode).toBe("H001");
    expect(state!.totalChecks).toBe(1);
    expect(state!.lastChecked).toBeTruthy();
  });

  it("increments totalChecks on subsequent saves", async () => {
    const products = [makeProduct("H001")];

    await saveState(products, null);
    const state1 = await loadState();

    await saveState(products, state1);
    const state2 = await loadState();

    expect(state2!.totalChecks).toBe(2);
  });

  it("overwrites previous state", async () => {
    await saveState([makeProduct("H001")], null);
    await saveState([makeProduct("H002"), makeProduct("H003")], { lastChecked: "", products: [], totalChecks: 1 });

    const state = await loadState();
    expect(state!.products).toHaveLength(2);
    expect(state!.products[0].productCode).toBe("H002");
  });
});
