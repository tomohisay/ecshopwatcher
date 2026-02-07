import type { DiffResult, Product, Notifier } from "../types.js";
import { config, type WatcherConfig } from "../config.js";
import { ConsoleNotifier } from "./console.js";
import { LineNotifier } from "./line.js";

export function createNotifiers(cfg?: WatcherConfig): Notifier[] {
  const c = cfg ?? config;
  const notifiers: Notifier[] = [];

  if (c.notifiers.console.enabled) {
    notifiers.push(new ConsoleNotifier(c.messages, c.site.timezone));
  }

  if (c.notifiers.line.enabled) {
    notifiers.push(new LineNotifier(c.messages, c.site.timezone, c.notifiers.line.users));
  }

  return notifiers;
}

export async function notifyAll(
  notifiers: Notifier[],
  diff: DiffResult,
  currentProducts: Product[],
): Promise<void> {
  for (const notifier of notifiers) {
    try {
      await notifier.notify(diff, currentProducts);
    } catch (error) {
      console.error(`Notification failed for ${notifier.constructor.name}:`, error);
    }
  }
}
