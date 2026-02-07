import type { DiffResult, Product, Notifier } from "../types.js";
import { ConsoleNotifier } from "./console.js";
import { LineNotifier } from "./line.js";

export function createNotifiers(): Notifier[] {
  const notifiers: Notifier[] = [new ConsoleNotifier()];
  notifiers.push(new LineNotifier());
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
