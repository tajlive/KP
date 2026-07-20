/**
 * Hermes cron: Auto-trading for Klarpakkes 10 norske testbrukere.
 *
 * - 1-2 handler per bruker per kjøring (BUY eller SELL)
 * - Tilfeldig coin (BTC/ETH/SOL), pris nær markedspris (±0.15%)
 * - Miks av BUY/SELL → noen handler i pluss, noen i minus (FIFO realisert P&L)
 * - Bruker samme executeTrade-pipeline som /api/paper-trading/execute
 *   (service-role, dokumentert støttet for system/cron-bruk)
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

// Klarpakkes 10 norske testbrukere (paper_accounts)
const TEST_USERS = [
  { id: "4211b1c7-2b0d-4a55-b397-a10b3ae598a7", name: "Ingrid Sol" },
  { id: "eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8", name: "Kari Aas" },
  { id: "241e1133-c895-4e64-a02f-447af4ea90b6", name: "Lars Vik" },
  { id: "10de2b9b-62c3-43a0-8d83-c1e38aecba5d", name: "Marte Hav" },
  { id: "7734a444-0094-4a8a-9744-cd09c2a2cfd2", name: "Anne Mo" },
  { id: "4bd58f81-c41c-49ca-a712-b5aecbc8548d", name: "Bjørn Fjell" },
  { id: "67db9b24-3c98-4196-9f88-e70c2c164a03", name: "Ola Nordmann" },
  { id: "d4480fda-6c67-4e77-b4a3-ad4b7d00f652", name: "Per Berg" },
  { id: "165b894d-f747-4c1a-8ca1-1e9e2df0925a", name: "Silje Lund" },
  { id: "f4d68672-d994-4d4b-855a-36f39c71d09d", name: "Trond Dal" },
] as const;

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"] as const;
type Symbol = (typeof SYMBOLS)[number];

async function fetchPrices(): Promise<Record<Symbol, number>> {
  const out = {} as Record<Symbol, number>;
  for (const s of SYMBOLS) {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${s}`,
    );
    if (!res.ok) throw new Error(`Binance ${res.status} for ${s}`);
    const data = (await res.json()) as { price: string };
    out[s] = Number(data.price);
  }
  return out;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

async function main() {
  const prices = await fetchPrices();
  const rate = await getUsdtToNokRateAsync(sb);
  console.log(
    `Priser: BTC=${prices.BTCUSDT} ETH=${prices.ETHUSDT} SOL=${prices.SOLUSDT} | USDT/NOK=${rate}\n`,
  );

  let ok = 0;
  let fail = 0;
  let wins = 0;
  let losses = 0;

  for (let u = 0; u < TEST_USERS.length; u++) {
    const user = TEST_USERS[u];
    const tradeCount = Math.random() < 0.6 ? 2 : 1; // 1-2 handler

    for (let t = 0; t < tradeCount; t++) {
      const symbol = pick(SYMBOLS);
      const market = prices[symbol];
      // Pris nær markedspris (±0.15%)
      const price = Math.round(market * (1 + rand(-0.0015, 0.0015)) * 100) / 100;

      // Sikre miks: annenhver bruker starter med SELL, resten BUY.
      // 2. handel er motsatt side for spredning.
      const side: "buy" | "sell" =
        tradeCount === 2 ? (t === 0 ? (u % 2 === 0 ? "buy" : "sell") : u % 2 === 0 ? "sell" : "buy")
        : u % 2 === 0 ? "buy" : "sell";

      // Tilfeldig handelsstørrelse 800–3500 kr
      const amountNok = Math.round(rand(800, 3500));
      const quantity = amountNok / rate / price;

      try {
        const result = await executeTrade(sb, {
          userId: user.id,
          symbol,
          side,
          quantity,
          price,
          orderType: "market",
          mode: "paper",
          reasonCode:
            side === "buy"
              ? pick(["MULTI_SIGNAL_BUY", "RSI_DIP_BUY", "TREND_BREAKOUT_BUY"] as const)
              : pick(["TAKE_PROFIT_SELL", "TREND_REVERSAL_SELL", "PARTIAL_TP_SELL"] as const),
        });

        if (result.success) {
          ok++;
          let pnl: number | null = null;
          if (side === "sell" && result.tradeId) {
            const { data: tr } = await sb
              .from("trades")
              .select("realized_pnl")
              .eq("id", result.tradeId)
              .single();
            pnl = tr?.realized_pnl != null ? Number(tr.realized_pnl) : null;
          }
          if (side === "sell" && pnl !== null) {
            if (pnl >= 0) wins++;
            else losses++;
          }
          console.log(
            `✅ ${user.name.padEnd(14)} | ${side.toUpperCase()} ${quantity.toFixed(8)} ${symbol} @ ${price} (~${amountNok} kr)` +
              (pnl != null ? ` | realisert P&L: ${pnl > 0 ? "+" : ""}${Number(pnl).toFixed(2)} kr` : "") +
              ` | saldo=${result.newBalance ?? "?"}`,
          );
        } else {
          fail++;
          console.log(
            `❌ ${user.name.padEnd(14)} | ${side.toUpperCase()} ${symbol} ~${amountNok} kr | AVVIST: ${result.error} (${result.rejectionReason ?? "n/a"})`,
          );
        }
      } catch (err) {
        fail++;
        console.log(`💥 ${user.name.padEnd(14)} | ${side.toUpperCase()} ${symbol} | ${err}`);
      }
    }
  }

  console.log(
    `\nFerdig: ${ok} OK, ${fail} feilet | realiserte gevinster: ${wins}, realiserte tap: ${losses}`,
  );
  if (ok === 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
