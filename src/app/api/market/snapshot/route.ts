import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface MarketSnapshot {
  assets: Array<{
    symbol: string;
    name: string;
    price: number;
    change24hPct: number;
    high24h: number;
    low24h: number;
    volume24h: number;
  }>;
  updatedAt: string;
}

const ASSETS = [
  { symbol: "BTCUSDT", name: "Bitcoin" },
  { symbol: "ETHUSDT", name: "Ethereum" },
  { symbol: "SOLUSDT", name: "Solana" },
  { symbol: "BNBUSDT", name: "BNB" },
  { symbol: "XRPUSDT", name: "XRP" },
];

export async function GET() {
  try {
    const symbolsParam = encodeURIComponent(
      JSON.stringify(ASSETS.map((a) => a.symbol))
    );

    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`,
      {
        next: { revalidate: 30 },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Binance API error", status: res.status },
        { status: 502 }
      );
    }

    const rows = (await res.json()) as Array<{
      symbol: string;
      lastPrice: string;
      priceChangePercent: string;
      highPrice: string;
      lowPrice: string;
      volume: string;
    }>;

    const assets = rows.map((row) => {
      const meta = ASSETS.find((a) => a.symbol === row.symbol);
      return {
        symbol: meta?.name ?? row.symbol,
        name: meta?.name ?? row.symbol,
        price: parseFloat(row.lastPrice),
        change24hPct: parseFloat(row.priceChangePercent),
        high24h: parseFloat(row.highPrice),
        low24h: parseFloat(row.lowPrice),
        volume24h: parseFloat(row.volume),
      };
    });

    const snapshot: MarketSnapshot = {
      assets,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch market snapshot" },
      { status: 502 }
    );
  }
}
