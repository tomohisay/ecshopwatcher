import type { DiffResult, Product, Notifier } from "../types.js";

function formatProduct(product: Product, index: number): string {
  return [
    `${index}. ${product.name}`,
    `   カラー: ${product.color}`,
    `   価格: ${product.price}`,
    `   ${product.url}`,
  ].join("\n");
}

export class ConsoleNotifier implements Notifier {
  async notify(diff: DiffResult, currentProducts: Product[]): Promise<void> {
    const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
    const lines: string[] = [];

    if (diff.added.length > 0) {
      lines.push(`\n🆕 エルメス新商品通知\n`);
      lines.push(`■ 新規追加 (${diff.added.length}件)`);
      lines.push("━━━━━━━━━━━━\n");
      diff.added.forEach((p, i) => lines.push(formatProduct(p, i + 1) + "\n"));
    }

    if (diff.removed.length > 0) {
      lines.push(`\n🗑️ 掲載終了 (${diff.removed.length}件)`);
      lines.push("━━━━━━━━━━━━\n");
      diff.removed.forEach((p, i) => lines.push(formatProduct(p, i + 1) + "\n"));
    }

    if (diff.priceChanged.length > 0) {
      lines.push(`\n💰 価格変更 (${diff.priceChanged.length}件)`);
      lines.push("━━━━━━━━━━━━\n");
      diff.priceChanged.forEach((change, i) => {
        lines.push(`${i + 1}. ${change.product.name}`);
        lines.push(`   ${change.oldPrice} → ${change.newPrice}`);
        lines.push(`   ${change.product.url}\n`);
      });
    }

    lines.push("━━━━━━━━━━━━");
    lines.push(`確認時刻: ${now}`);
    lines.push(`現在の掲載数: ${currentProducts.length}件`);

    console.log(lines.join("\n"));
  }
}
