import { config } from "dotenv";
config({ path: ".env.local" });
import { acquireTradeLock } from "@/lib/trading/core/distributed-lock";

const users = ["u1","u2","u3","u4","u5"];
async function main() {
  for (const u of users) {
    const r = await acquireTradeLock(u, "BTCUSDT", { ttlSeconds: 35, retries: 2, retryDelayMs: 50 });
    console.log(u, r.acquired, r.error ?? "");
    if (r.acquired) await r.release();
  }
}
main();
