/**
 * One-off retry: 1-2 handler for brukere som fikk 0 handler i hovedkjøringen.
 * Velger SELL mot åpen posisjon med gevinst der mulig (FIFO), ellers BUY.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { executeTrade } from "@/lib/trading/core/execute-trade";
import { getUsdtToNokRateAsync } from "@/lib/trading/currency";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) process.exit(1);
const sb = createClient<Database>(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { id: "eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8", name: "Kari Aas" },
  { id: "67db9b24-3c98-4196-9f88-e70c2c164a03", name: "Ola Nordmann" },
];
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"] as const;

async function fetchPrices() {
  const out = {} as Record<(typeof SYMBOLS)[number], number>;
  for (const s of SYMBOLS) {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${s}`);
    out[s] = Number((await res.json()).price);
  }
  return out;
}

/** FIFO åpen posisjon (qty + snittkost i NOK) fra trades-historikk. */
async function fifoBasis(userId: string, symbol: string) {
  const { data, error } = await sb
    .from("trades")
    .select("side, quantity, price")
    .eq("user_id", userId)
    .eq("trading_pair", symbol)
    .order("executed_at", { ascending: true });
  if (error || !data) return { qty: 0, basis: 0 };
  const lots: { qty: number; price: number }[] = [];
  for (const t of data) {
    const q = Number(t.quantity);
    const p = Number(t.price); // lagret i NOK
    if (t.side === "buy") lots.push({ qty: q, price: p });
    else {
      let rem = q;
      while (rem > 1e-12 && lots.length) {
        const lot = lots[0];
        const used = Math.min(lot.qty, rem);
        lot.qty -= used;
        rem -= used;
        if (lot.qty <= 1e-12) lots.shift();
      }
    }
  }
  const qty = lots.reduce((a, l) => a + l.qty, 0);
  const cost = lots.reduce((a, l) => a + l.qty * l.price, 0);
  return { qty, basis: qty > 0 ? cost / qty : 0 };
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  const prices = await fetchPrices();
  const rate = await getUsdtToNokRateAsync(sb);
  console.log(`Priser: BTC=${prices.BTCUSDT} ETH=${prices.ETHUSDT} SOL=${prices.SOLUSDT} | rate=${rate}`);

  let ok = 0, wins = 0, losses = 0;

  for (const user of USERS) {
    // Finn SELL-kandidater med gevinst (åpen posisjon, pris > basis + 0.3%)
    const sellWins: { symbol: (typeof SYMBOLS)[number]; qty: number; basis: number }[] = [];
    const sellAny: typeof sellWins = [];
    for (const s of SYMBOLS) {
      const { qty, basis } = await fifoBasis(user.id, s);
      if (qty <= 1e-8) continue;
      const marketNok = prices[s] * rate;
      console.log(`  ${user.name} ${s}: åpen=${qty.toFixed(6)} basis=${basis.toFixed(0)} NOK marked=${marketNok.toFixed(0)} NOK`);
      if (marketNok > basis * 1.003) sellWins.push({ symbol: s, qty, basis });
      else sellAny.push({ symbol: s, qty, basis });
    }

    const tradeCount = Math.random() < 0.5 ? 2 : 1;
    for (let t = 0; t < tradeCount; t++) {
      let side: "buy" | "sell";
      let symbol: (typeof SYMBOLS)[number];
      let quantity: number;

      if (t === 0 && sellWins.length) {
        const c = pick(sellWins);
        side = "sell"; symbol = c.symbol;
        const amountNok = Math.round(rand(800, 2500));
        quantity = Math.min(c.qty * 0.95, amountNok / rate / prices[symbol]);
      } else if (t === 0 && sellAny.length && Math.random() < 0.5) {
        const c = pick(sellAny);
        side = "sell"; symbol = c.symbol;
        const amountNok = Math.round(rand(800, 2500));
        quantity = Math.min(c.qty * 0.95, amountNok / rate / prices[symbol]);
      } else {
        side = "buy"; symbol = pick(SYMBOLS);
        quantity = Math.round(rand(800, 3000)) / rate / prices[symbol];
      }

      const price = Math.round(prices[symbol] * (1 + rand(-0.0015, 0.0015)) * 100) / 100;

      try {
        const result = await executeTrade(sb, {
          userId: user.id, symbol, side, quantity, price,
          orderType: "market", mode: "paper",
          reasonCode: side === "buy" ? "RSI_DIP_BUY" : "TAKE_PROFIT_SELL",
        });
        if (result.success) {
          ok++;
          let pnl: number | null = null;
          if (side === "sell" && result.tradeId) {
            const { data: tr } = await sb.from("trades").select("realized_pnl").eq("id", result.tradeId).single();
            pnl = tr?.realized_pnl != null ? Number(tr.realized_pnl) : null;
            if (pnl != null) pnl >= 0 ? wins++ : losses++;
          }
          console.log(`✅ ${user.name} | ${side.toUpperCase()} ${quantity.toFixed(8)} ${symbol} @ ${price}` +
            (pnl != null ? ` | P&L: ${pnl > 0 ? "+" : ""}${pnl.toFixed(2)} kr` : "") +
            ` | saldo=${result.newBalance ?? "?"}`);
        } else {
          console.log(`❌ ${user.name} | ${side.toUpperCase()} ${symbol} | AVVIST: ${result.error}`);
        }
      } catch (e) {
        console.log(`💥 ${user.name} | ${e}`);
      }
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  console.log(`\nRetry ferdig: ${ok} OK | gevinster: ${wins}, tap: ${losses}`);
  if (ok === 0) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
