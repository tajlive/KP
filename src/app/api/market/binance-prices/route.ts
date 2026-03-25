import { NextRequest, NextResponse } from "next/server";

export const revalidate = 5;

type BinancePriceRow = { symbol: string; price: string };

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

  // Binance supports: /api/v3/ticker/price?symbols=["BTCUSDT","ETHUSDT"]
  const encoded = encodeURIComponent(JSON.stringify(symbolList));

  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbols=${encoded}`,
      {
        next: { revalidate: 5 },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: "Binance error", status: res.status },
        { status: 502 },
      );
    }
    const rows = (await res.json()) as BinancePriceRow[];
    const prices = rows
      .map((r) => ({ symbol: r.symbol, price: Number(r.price) }))
      .filter((r) => Number.isFinite(r.price) && r.price > 0);
    return NextResponse.json(
      { prices },
      {
        headers: {
          // Cache short-lived market data at the CDN level
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch Binance prices" },
      { status: 502 },
    );
  }
}

