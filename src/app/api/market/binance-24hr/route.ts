import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BINANCE_PROXY_URL = "https://pskhryjzkobytnfwucrb.supabase.co/functions/v1/binance-proxy";

/**
 * Offentlig proxy: Binance 24h-ticker for flere symboler.
 * Unngår CORS i nettleser og krever ikke innlogging.
 *
 * Fallback-kjede:
 * 1. Supabase binance-proxy edge function
 * 2. Direkte Binance API (blokkeres ofte fra Cloudflare Workers)
 * 3. DB coin_prices (cachet) — siste utvei
 */

async function fetchViaProxy(symbols: string[]): Promise<Response | null> {
  try {
    const res = await fetch(BINANCE_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols, type: "24hr" }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return res;
  } catch { /* fall through */ }
  return null;
}

async function fetchDirectBinance(symbols: string[]): Promise<Response | null> {
  try {
    const encoded = encodeURIComponent(JSON.stringify(symbols));
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${encoded}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (res.ok) return res;
  } catch { /* fall through */ }
  return null;
}

async function fetchFromDB(symbols: string[]) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coin_prices")
    .select("symbol, price, price_change_percent_24h")
    .in("symbol", symbols);

  if (!data || data.length === 0) return null;

  return data.map((row) => ({
    symbol: row.symbol,
    price: Number(row.price ?? 0),
    change24h: Number(row.price_change_percent_24h ?? 0),
  }));
}

export async function GET(request: NextRequest) {
  const raw =
    request.nextUrl.searchParams.get("symbols") ?? "BTCUSDT,ETHUSDT,SOLUSDT";
  const symbolList = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (symbolList.length === 0) {
    return NextResponse.json({ error: "No symbols" }, { status: 400 });
  }

  // --- Single-symbol path ---
  if (symbolList.length === 1) {
    const symbol = symbolList[0]!;

    // 1. Proxy
    let res = await fetchViaProxy([symbol]);
    // 2. Direct Binance
    if (!res) {
      try {
        res = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
          { signal: AbortSignal.timeout(8000) },
        );
      } catch { /* fall through */ }
    }

    if (res?.ok) {
      try {
        const ticker = await res.json() as { symbol: string; lastPrice: string; priceChangePercent: string };
        return NextResponse.json({
          prices: [{
            symbol: ticker.symbol,
            price: parseFloat(ticker.lastPrice),
            change24h: parseFloat(ticker.priceChangePercent),
          }],
        });
      } catch { /* corrupt response — fall through */ }
    }

    // 3. DB fallback
    const dbPrices = await fetchFromDB([symbol]);
    if (dbPrices && dbPrices.length > 0) {
      return NextResponse.json({ prices: dbPrices, source: "db-cache" });
    }

    return NextResponse.json({ error: "Failed to fetch ticker" }, { status: 502 });
  }

  // --- Multi-symbol path ---
  // 1. Proxy
  let res = await fetchViaProxy(symbolList);
  // 2. Direct Binance
  if (!res) {
    res = await fetchDirectBinance(symbolList);
  }

  if (res?.ok) {
    try {
      const tickers = await res.json() as Array<{
        symbol: string;
        lastPrice: string;
        priceChangePercent: string;
      }>;
      const prices = tickers.map((t) => ({
        symbol: t.symbol,
        price: parseFloat(t.lastPrice),
        change24h: parseFloat(t.priceChangePercent),
      }));
      return NextResponse.json({ prices });
    } catch { /* fall through */ }
  }

  // 3. DB fallback
  const dbPrices = await fetchFromDB(symbolList);
  if (dbPrices && dbPrices.length > 0) {
    return NextResponse.json({ prices: dbPrices, source: "db-cache" });
  }

  return NextResponse.json({ error: "Failed to fetch Binance tickers" }, { status: 502 });
}
