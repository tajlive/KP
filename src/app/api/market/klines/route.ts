import { NextRequest, NextResponse } from "next/server";
import { createKrakenMarketDataProvider } from "@/lib/trading/canonical/market-data";

export const revalidate = 5;
export const dynamic = "force-dynamic";

/**
 * Klines (OHLCV) — Kraken er eneste priskilde (EU/EØS 2026).
 * GET /api/market/klines?symbol=BTCUSDT&interval=15m&limit=40
 */
export async function GET(request: NextRequest) {
  const symbol = (request.nextUrl.searchParams.get("symbol") ?? "").trim().toUpperCase();
  const interval = (request.nextUrl.searchParams.get("interval") ?? "5m").trim();
  const limit = Math.min(
    Math.max(parseInt(request.nextUrl.searchParams.get("limit") ?? "100", 10) || 100, 1),
    500,
  );

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const provider = createKrakenMarketDataProvider();

  try {
    const klines = await provider.getKlines(symbol, interval, limit);

    return NextResponse.json(
      { symbol, interval, klines },
      {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30",
        },
      },
    );
  } catch (error) {
    console.error("[market/klines] Failed:", error);
    return NextResponse.json(
      { error: "Kraken API-feil — prøv igjen" },
      { status: 502 },
    );
  }
}
