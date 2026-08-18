import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/auth/cron";
import { usdtPriceToNok } from "@/lib/market/nok";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createKrakenMarketDataProvider } from "@/lib/trading/canonical/market-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Kraken-par (USDC-kvote — EU/EØS 2026; BNB finnes ikke på Kraken)
const TRACKED_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "DOGEUSDT",
  "AVAXUSDT",
  "DOTUSDT",
  "LINKUSDT",
  "UNIUSDT",
  "POLUSDT",
];

interface PriceRow {
  symbol: string;
  price: number;
  price_change_percent_24h: number;
}

async function upsertPrices(
  supabase: SupabaseClient<Database>,
  prices: PriceRow[],
) {
  const updates = prices.map((t) => ({
    symbol: t.symbol,
    name: t.symbol.replace("USDT", ""),
    price: usdtPriceToNok(t.price),
    price_change_percent_24h: t.price_change_percent_24h,
    volume_24h: 0,
    high_24h: 0,
    low_24h: 0,
    last_updated: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("coin_prices")
    .upsert(updates, { onConflict: "symbol" });

  // 2026-08-19 (prod-hendelse): upsert-feil ble kun console.error'ed og ruten
  // svarte «success:true, updated:N» selv om 0 rader ble skrevet — cache lå
  // frosset i 9 døgn uten at noen så det. Feil her er ALLTID kritisk.
  if (error) {
    throw new Error(
      `coin_prices upsert feilet: ${error.message} (${error.code ?? "ukjent kode"})`,
    );
  }
}

/**
 * GET /api/cron/sync-prices
 * Synker priser fra Kraken (eneste tallkilde — EU/EØS 2026) til Supabase.
 */
export async function GET(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const provider = createKrakenMarketDataProvider();

    const snapshots = await Promise.all(
      TRACKED_SYMBOLS.map(async (symbol) => {
        try {
          const snap = await provider.get24hSnapshot(symbol);
          return { symbol, snap };
        } catch {
          return null;
        }
      }),
    );

    const prices: PriceRow[] = snapshots
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .map(({ symbol, snap }) => ({
        symbol,
        price: snap.price,
        price_change_percent_24h: snap.change24hPct,
      }))
      .filter((r) => r.price > 0);

    // Ingen priser hentet (alle kilder nede) er IKKE «success» — gjør det
    // synlig for cron-watchdog/health-monitor i stedet for stille grønt.
    if (prices.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ingen priser hentet — Kraken+OKX nede eller alle mappinger feilet",
          updated: 0,
          timestamp: new Date().toISOString(),
        },
        { status: 502 },
      );
    }

    await upsertPrices(supabase, prices);

    return NextResponse.json({
      success: true,
      updated: prices.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[sync-prices] Kraken error:", error);
    return NextResponse.json(
      { success: false, error: "Kraken API-feil" },
      { status: 502 },
    );
  }
}
