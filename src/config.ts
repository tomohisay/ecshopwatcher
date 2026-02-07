import { resolve } from "node:path";
import { config as dotenvConfig } from "dotenv";
import type { Config } from "./types.js";

dotenvConfig();

const dataDir = resolve(process.cwd(), "data");

export const config: Config = {
  targetUrl:
    "https://www.hermes.com/jp/ja/category/leather-goods/bags-and-clutches/womens-bags-and-clutches/",
  lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  lineTargetUserId: process.env.LINE_TARGET_USER_ID,
  dataDir,
  productsFile: resolve(dataDir, "products.json"),
};
