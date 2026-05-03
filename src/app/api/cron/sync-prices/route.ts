import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export const dynamic = "force-dynamic";

const TRACKED_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "DOGEUSDT",
  "AVAXUSDT",
  "DOTUSDT",
  "LINKUSDT",
  "MATICUSDT",
];

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  highPrice: string;
  lowPrice: string;
}

/**
 * GET /api/cron/sync-prices
 * Syncs prices from Binance API to Supabase
 * Called by Vercel Cron or external scheduler
 */
export async function GET(request: NextRequest) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch from Binance API — OPTIMIZED: request only tracked symbols
    // Weight: 2-4 instead of 40 for all symbols
    const encodedSymbols = encodeURIComponent(JSON.stringify(TRACKED_SYMBOLS));
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodedSymbols}`,
      { next: { revalidate: 0 } },
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const tickers: BinanceTicker[] = await response.json();

    const updates = tickers.map((t) => ({
        symbol: t.symbol,
        name: t.symbol.replace("USDT", ""),
        price: parseFloat(t.lastPrice),
        price_change_percent_24h: parseFloat(t.priceChangePercent),
        volume_24h: parseFloat(t.volume),
        high_24h: parseFloat(t.highPrice),
        low_24h: parseFloat(t.lowPrice),
        last_updated: new Date().toISOString(),
      }));

    // Upsert to Supabase
    const supabase = await createClient() as SupabaseClient<Database>;

    const { error } = await supabase
      .from("coin_prices")
      .upsert(updates, { onConflict: "symbol" });

    if (error) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated: updates.length,
      symbols: updates.map((u) => u.symbol),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Sync prices error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Also support POST for pg_cron triggering
export const POST = GET;
