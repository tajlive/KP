import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { executeTrade } from "@/lib/trading/core/execute-trade";

const sb = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT");
  const { price } = (await res.json()) as { price: string };
  const market = Number(price);
  const p = Math.round(market * 1.0005 * 100) / 100;
  const quantity = 1500 / 9.65 / p;
  const r = await executeTrade(sb, {
    userId: "eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8",
    symbol: "BTCUSDT",
    side: "buy",
    quantity,
    price: p,
    orderType: "market",
    mode: "paper",
    reasonCode: "MULTI_SIGNAL_BUY",
  });
  console.log("RESULT:", JSON.stringify(r));
}
main().catch((e) => { console.error(e); process.exit(1); });
