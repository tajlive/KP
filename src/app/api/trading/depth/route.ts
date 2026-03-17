import { NextRequest, NextResponse } from "next/server";
import { getUsdtToNokRate } from "@/lib/trading/currency";

const depthCache = new Map<
  string,
  { bids: [number, number][]; asks: [number, number][]; timestamp: number }
>();
const CACHE_TTL_MS = 3000;
const DEPTH_LIMIT = 10;

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") || "BTCUSDT";

  const cached = depthCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      symbol,
      bids: cached.bids,
      asks: cached.asks,
      cached: true,
    });
  }

  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/depth?symbol=${symbol.toUpperCase()}&limit=${DEPTH_LIMIT}`,
      { signal: AbortSignal.timeout(5000) },
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();
    const rate = getUsdtToNokRate();

    const toNok = (p: string) => parseFloat(p) * rate;
    const bids: [number, number][] = (data.bids || []).slice(0, DEPTH_LIMIT).map((b: [string, string]) => [
      toNok(b[0]),
      parseFloat(b[1]),
    ]);
    const asks: [number, number][] = (data.asks || []).slice(0, DEPTH_LIMIT).map((a: [string, string]) => [
      toNok(a[0]),
      parseFloat(a[1]),
    ]);

    depthCache.set(symbol, { bids, asks, timestamp: Date.now() });

    return NextResponse.json({
      symbol,
      bids,
      asks,
      cached: false,
    });
  } catch (_error) {
    const cached = depthCache.get(symbol);
    if (cached) {
      return NextResponse.json({
        symbol,
        bids: cached.bids,
        asks: cached.asks,
        cached: true,
        stale: true,
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch order book" },
      { status: 502 },
    );
  }
}
