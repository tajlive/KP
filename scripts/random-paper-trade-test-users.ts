/**
 * Tilfeldig papirhandel for testbrukere uten tidligere trades.
 * Kjører samme executeTrade-pipeline som /api/paper-trading/execute
 * (service-role klient, dokumentert støttet for system/cron-bruk).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { executeTrade } from "@/lib/trading/core/execute-trade";
import { getUsdtToNokRateAsync } from "@/lib/trading/currency";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Mangler SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient<Database>(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SYMBOLS = ["BTCUSDT", "ETHUSDT"] as const;

async function fetchPrice(symbol: string): Promise<number> {
  const res = await fetch(
    `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
  );
  if (!res.ok) throw new Error(`Binance ${res.status} for ${symbol}`);
  const data = (await res.json()) as { price: string };
  return Number(data.price);
}

async function main() {
  // 1. Finn paper_accounts med saldo > 0
  const { data: accounts, error: accErr } = await sb
    .from("paper_accounts")
    .select("user_id, current_balance")
    .gt("current_balance", 0);
  if (accErr) throw accErr;
  if (!accounts?.length) {
    console.log("Ingen paper_accounts med saldo > 0");
    return;
  }

  // 2. Filtrer bort brukere som har trades fra før (head-count per bruker,
  //    unngår 1000-raders grense på vanlig select)
  const eligible: typeof accounts = [];
  let skipped = 0;
  for (const acc of accounts) {
    const { count, error: cErr } = await sb
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("user_id", acc.user_id);
    if (cErr) throw cErr;
    if ((count ?? 0) === 0) eligible.push(acc);
    else skipped++;
  }

  console.log(
    `Paper accounts m/saldo: ${accounts.length}, med trades fra før: ${skipped}, kvalifisert: ${eligible.length}`,
  );

  const rate = await getUsdtToNokRateAsync(sb);
  console.log(`USDT/NOK rate: ${rate}\n`);

  let ok = 0;
  let fail = 0;
  for (const acc of eligible) {
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const amountNok = Math.round(900 + Math.random() * 200); // 900-1100 kr
    try {
      const price = await fetchPrice(symbol);
      const quantity = amountNok / rate / price;

      const result = await executeTrade(sb, {
        userId: acc.user_id,
        symbol,
        side: "buy",
        quantity,
        price,
        orderType: "market",
        mode: "paper",
      });

      if (result.success) {
        ok++;
        console.log(
          `✅ ${acc.user_id} | BUY ${quantity.toFixed(8)} ${symbol} @ ${price} (~${amountNok} kr) | trade=${result.tradeId} | ny saldo=${result.newBalance ?? "?"} | session=${result.sessionId}`,
        );
      } else {
        fail++;
        console.log(
          `❌ ${acc.user_id} | ${symbol} ~${amountNok} kr | AVVIST: ${result.error} (${result.rejectionReason ?? "n/a"})`,
        );
      }
    } catch (err) {
      fail++;
      console.log(`❌ ${acc.user_id} | ${symbol} | FEIL: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nFerdig: ${ok} kjøp utført, ${fail} feilet/avvist`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
