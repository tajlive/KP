import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createKrakenMarketDataProvider } from "@/lib/trading/canonical/market-data";
import { getUsdtToNokRateAsync } from "@/lib/trading/currency";

/**
 * Offentlig rute: 24h-ticker for flere symboler.
 * EU/EØS (2026): Kraken er eneste tallkilde (MiCA).
 *
 * Fallback-kjede:
 * 1. Kraken public Ticker (ett kall per symbol — usignert, ingen CORS-problem)
 * 2. DB coin_prices (cachet) — siste utvei
 */

async function fetchFromDB(symbols: string[]) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coin_prices")
    .select("symbol, price, price_change_percent_24h")
    .in("symbol", symbols);

  if (!data || data.length === 0) return null;

  // coin_prices.price er NOK (sync-prices konverterer USDT→NOK). Live-veien
  // returnerer USDT — del på rate for konsistent kontrakt (2026-08-19).
  const rate = await getUsdtToNokRateAsync(supabase).catch(() => 0);
  const divisor = Number.isFinite(rate) && rate > 0 ? rate : 1;

  return data.map((row) => ({
    symbol: row.symbol,
    price: Number(row.price ?? 0) / divisor,
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

  // 1. Kraken Ticker — public API, ett kall per symbol
  try {
    const provider = createKrakenMarketDataProvider();
    const prices = await Promise.all(
      symbolList.map(async (symbol) => {
        try {
          const snap = await provider.get24hSnapshot(symbol);
          return {
            symbol,
            price: snap.price,
            change24h: snap.change24hPct,
          };
        } catch {
          return null;
        }
      }),
    );

    const valid = prices.filter(
      (p): p is { symbol: string; price: number; change24h: number } =>
        p !== null,
    );
    if (valid.length > 0) {
      return NextResponse.json({ prices: valid });
    }
  } catch {
    /* fall through til DB */
  }

  // 2. DB fallback
  const dbPrices = await fetchFromDB(symbolList);
  if (dbPrices && dbPrices.length > 0) {
    return NextResponse.json({ prices: dbPrices, source: "db-cache" });
  }

  return NextResponse.json(
    { error: "Failed to fetch tickers" },
    { status: 502 },
  );
}
