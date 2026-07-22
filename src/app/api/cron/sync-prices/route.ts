import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/auth/cron";
import { usdtPriceToNok } from "@/lib/market/nok";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export const dynamic = "force-dynamic";

const TRACKED_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
  "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "DOTUSDT", "LINKUSDT", "MATICUSDT",
];

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  highPrice: string;
  lowPrice: string;
}

async function upsertPrices(supabase: SupabaseClient<Database>, tickers: BinanceTicker[]) {
  const updates = tickers.map((t) => ({
    symbol: t.symbol,
    name: t.symbol.replace("USDT", ""),
    price: usdtPriceToNok(parseFloat(t.lastPrice)),
    price_change_percent_24h: parseFloat(t.priceChangePercent),
    volume_24h: parseFloat(t.volume),
    high_24h: usdtPriceToNok(parseFloat(t.highPrice)),
    low_24h: usdtPriceToNok(parseFloat(t.lowPrice)),
    last_updated: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("coin_prices")
    .upsert(updates, { onConflict: "symbol" });

  if (error) console.error("Supabase upsert error:", error);
}

/**
 * GET /api/cron/sync-prices
 * Syncs prices from Binance API to Supabase via Edge Function proxy
 */
export async function GET(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const encodedSymbols = encodeURIComponent(JSON.stringify(TRACKED_SYMBOLS));
    const supabase = await createClient() as SupabaseClient<Database>;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const proxySecret = process.env.BINANCE_PROXY_SECRET;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // Try via Supabase Edge Function proxy first (unngår Cloudflare IP-blokk)
    if (supabaseUrl && proxySecret && anonKey) {
      const proxyRes = await fetch(`${supabaseUrl}/functions/v1/binance-proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
          "x-binance-proxy-secret": proxySecret,
          apikey: anonKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          action: "publicApi",
          publicApiPath: `/api/v3/ticker/24hr?symbols=${encodedSymbols}`,
        }),
      });

      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        if (proxyData.ok && Array.isArray(proxyData.data)) {
          await upsertPrices(supabase, proxyData.data as BinanceTicker[]);
          clearTimeout(timeoutId);
          return NextResponse.json({
            success: true,
            updated: proxyData.data.length,
            timestamp: new Date().toISOString(),
          });
        }
      }
      console.warn("Binance proxy failed, falling back to direct API");
    }

    // Fallback: direct Binance API
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodedSymbols}`,
      { signal: controller.signal },
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const tickers: BinanceTicker[] = await response.json();
    await upsertPrices(supabase, tickers);
    clearTimeout(timeoutId);

    return NextResponse.json({
      success: true,
      updated: tickers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Sync prices error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export const POST = GET;
