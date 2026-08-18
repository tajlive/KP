import { createKrakenMarketDataProvider } from "@/lib/trading/canonical/market-data";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 5;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("symbols") ?? "";
  const symbolList = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (symbolList.length === 0) {
    return NextResponse.json({ prices: [] });
  }

  // Guardrail: avoid unbounded proxying / abuse
  if (symbolList.length > 50) {
    return NextResponse.json(
      { error: "Too many symbols (max 50)" },
      { status: 400 },
    );
  }

  const provider = createKrakenMarketDataProvider();

  try {
    const prices = await Promise.all(
      symbolList.map(async (symbol) => {
        const price = await provider.getPrice(symbol);
        return { symbol, price };
      }),
    );

    const validPrices = prices.filter(
      (r) => Number.isFinite(r.price) && r.price > 0,
    );

    return NextResponse.json(
      { prices: validPrices },
      {
        headers: {
          // Cache short-lived market data at the CDN level
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30",
        },
      },
    );
  } catch (error) {
    const symbol = symbolList[0];
    console.error("[market/prices] Failed to fetch prices:", error);
    // DB-fallback
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data: dbPrices } = await supabase
        .from("coin_prices")
        .select("symbol, price")
        .in("symbol", symbolList);
      if (dbPrices && dbPrices.length > 0) {
        // coin_prices.price er NOK — del på rate for USDT-kontrakt (2026-08-19)
        const { getUsdtToNokRateAsync } =
          await import("@/lib/trading/currency");
        const rate = await getUsdtToNokRateAsync(supabase).catch(() => 0);
        const divisor = Number.isFinite(rate) && rate > 0 ? rate : 1;
        const prices = dbPrices
          .map((r) => ({
            symbol: r.symbol,
            price: Number(r.price ?? 0) / divisor,
          }))
          .filter((p) => p.price > 0);
        return NextResponse.json({ prices });
      }
    } catch {
      /* fall through */
    }
    return NextResponse.json(
      { error: "Price fetch failed", symbol, status: 502 },
      { status: 502 },
    );
  }
}
