import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

// ── Type definitions ──

export interface SiteConfig {
  url: string;
  baseUrl: string;
  locale: string;
  timezone: string;
  selectors: {
    productList: string;
    image: string;
    title: string;
    color: string;
    price: string;
    link: string;
  };
  parsing: {
    productCodeAttr: string;
    productCodeReplace: string;
    colorStripPattern: string;
  };
}

export interface MessageConfig {
  header: string;
  added: string;
  removed: string;
  priceChanged: string;
  colorLabel: string;
  priceLabel: string;
  timeLabel: string;
  countLabel: string;
  countUnit: string;
}

export interface NotifierConfig {
  console: { enabled: boolean };
  line: { enabled: boolean; users: string[] };
}

export interface WatcherConfig {
  name: string;
  site: SiteConfig;
  messages: MessageConfig;
  notifiers: NotifierConfig;
  dataDir: string;
  productsFile: string;
}

// ── Env var expansion ──

function expandEnvVars(value: string): string {
  return value.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] ?? "");
}

function expandDeep(obj: unknown): unknown {
  if (typeof obj === "string") return expandEnvVars(obj);
  if (Array.isArray(obj)) return obj.map(expandDeep);
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = expandDeep(v);
    }
    return result;
  }
  return obj;
}

// ── Load config ──

export function loadConfig(configPath?: string): WatcherConfig {
  const filePath = configPath ?? resolve(process.cwd(), "watcher.config.yml");
  const raw = readFileSync(filePath, "utf-8");
  const parsed = expandDeep(parse(raw)) as Record<string, unknown>;

  const dataDir = resolve(process.cwd(), "data");

  return {
    name: parsed.name as string,
    site: parsed.site as SiteConfig,
    messages: parsed.messages as MessageConfig,
    notifiers: {
      console: (parsed.notifiers as Record<string, unknown>).console as { enabled: boolean },
      line: {
        ...((parsed.notifiers as Record<string, unknown>).line as { enabled: boolean; users: string[] }),
        users: (
          ((parsed.notifiers as Record<string, unknown>).line as { users: string[] }).users ?? []
        ).filter(Boolean),
      },
    },
    dataDir,
    productsFile: resolve(dataDir, "products.json"),
  };
}

export const config = loadConfig();
