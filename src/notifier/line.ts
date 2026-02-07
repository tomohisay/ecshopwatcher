import type { DiffResult, Product, Notifier } from "../types.js";
import { config, type MessageConfig } from "../config.js";

function formatProduct(product: Product, index: number, msg: MessageConfig): string {
  return [
    `${index}. ${product.name}`,
    `   ${msg.colorLabel}: ${product.color}`,
    `   ${msg.priceLabel}: ${product.price}`,
    `   ${product.url}`,
  ].join("\n");
}

function buildMessage(diff: DiffResult, currentProducts: Product[], msg: MessageConfig, timezone: string): string {
  const now = new Date().toLocaleString("ja-JP", { timeZone: timezone });
  const lines: string[] = [];

  if (diff.added.length > 0) {
    lines.push(`🆕 ${msg.header}\n`);
    lines.push(`■ ${msg.added} (${diff.added.length}${msg.countUnit})`);
    lines.push("━━━━━━━━━━━━\n");
    diff.added.forEach((p, i) => lines.push(formatProduct(p, i + 1, msg) + "\n"));
  }

  if (diff.removed.length > 0) {
    lines.push(`🗑️ ${msg.removed} (${diff.removed.length}${msg.countUnit})`);
    lines.push("━━━━━━━━━━━━\n");
    diff.removed.forEach((p, i) => lines.push(formatProduct(p, i + 1, msg) + "\n"));
  }

  if (diff.priceChanged.length > 0) {
    lines.push(`💰 ${msg.priceChanged} (${diff.priceChanged.length}${msg.countUnit})`);
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

  return lines.join("\n");
}

export class LineNotifier implements Notifier {
  private msg: MessageConfig;
  private timezone: string;
  private users: string[];

  constructor(msg?: MessageConfig, timezone?: string, users?: string[]) {
    this.msg = msg ?? config.messages;
    this.timezone = timezone ?? config.site.timezone;
    this.users = users ?? config.notifiers.line.users;
  }

  async notify(diff: DiffResult, currentProducts: Product[]): Promise<void> {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!token) {
      console.warn("LINE_CHANNEL_ACCESS_TOKEN not set, skipping LINE notification");
      return;
    }

    if (this.users.length === 0) {
      console.warn("No LINE users configured, skipping LINE notification");
      return;
    }

    const message = buildMessage(diff, currentProducts, this.msg, this.timezone);

    for (const userId of this.users) {
      const response = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: userId,
          messages: [{ type: "text", text: message }],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(`LINE API error for ${userId}: ${response.status} ${body}`);
        continue;
      }

      console.log(`LINE notification sent to ${userId}`);
    }
  }
}
