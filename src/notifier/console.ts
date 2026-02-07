import type { DiffResult, Product, Notifier } from "../types.js";
import { config, type MessageConfig, type SiteConfig } from "../config.js";

function formatProduct(product: Product, index: number, msg: MessageConfig): string {
  return [
    `${index}. ${product.name}`,
    `   ${msg.colorLabel}: ${product.color}`,
    `   ${msg.priceLabel}: ${product.price}`,
    `   ${product.url}`,
  ].join("\n");
}

export class ConsoleNotifier implements Notifier {
  private msg: MessageConfig;
  private timezone: string;

  constructor(msg?: MessageConfig, timezone?: string) {
    this.msg = msg ?? config.messages;
    this.timezone = timezone ?? config.site.timezone;
  }

  async notify(diff: DiffResult, currentProducts: Product[]): Promise<void> {
    const now = new Date().toLocaleString("ja-JP", { timeZone: this.timezone });
    const msg = this.msg;
    const lines: string[] = [];

    if (diff.added.length > 0) {
      lines.push(`\n🆕 ${msg.header}\n`);
      lines.push(`■ ${msg.added} (${diff.added.length}${msg.countUnit})`);
      lines.push("━━━━━━━━━━━━\n");
      diff.added.forEach((p, i) => lines.push(formatProduct(p, i + 1, msg) + "\n"));
    }

    if (diff.removed.length > 0) {
      lines.push(`\n🗑️ ${msg.removed} (${diff.removed.length}${msg.countUnit})`);
      lines.push("━━━━━━━━━━━━\n");
      diff.removed.forEach((p, i) => lines.push(formatProduct(p, i + 1, msg) + "\n"));
    }

    if (diff.priceChanged.length > 0) {
      lines.push(`\n💰 ${msg.priceChanged} (${diff.priceChanged.length}${msg.countUnit})`);
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

    console.log(lines.join("\n"));
  }
}
