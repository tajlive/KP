import { NextRequest, NextResponse } from "next/server";

const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL_MS = 2000;

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") || "BTCUSDT";

  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ symbol, price: cached.price, cached: true });
  }

  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`,
      { signal: AbortSignal.timeout(5000) },
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();
    const price = parseFloat(data.price);

    priceCache.set(symbol, { price, timestamp: Date.now() });

    return NextResponse.json({ symbol, price, cached: false });
  } catch (error) {
    const cached = priceCache.get(symbol);
    if (cached) {
      return NextResponse.json({
        symbol,
        price: cached.price,
        cached: true,
        stale: true,
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch price" },
      { status: 502 },
    );
  }
}
