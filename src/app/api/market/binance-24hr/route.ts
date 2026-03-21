import { NextRequest, NextResponse } from "next/server";

/**
 * Offentlig proxy: Binance 24h-ticker for flere symboler.
 * Unngår CORS i nettleser og krever ikke innlogging.
 * @see https://binance-docs.github.io/apidocs/spot/en/#24hr-ticker-price-change-statistics
 */
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

  try {
    if (symbolList.length === 1) {
      const symbol = symbolList[0]!;
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
        { cache: "no-store", signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) {
        return NextResponse.json(
          { error: "Binance error", status: res.status },
          { status: 502 },
        );
      }
      const ticker = (await res.json()) as {
        symbol: string;
        lastPrice: string;
        priceChangePercent: string;
      };
      return NextResponse.json({
        prices: [
          {
            symbol: ticker.symbol,
            price: parseFloat(ticker.lastPrice),
            change24h: parseFloat(ticker.priceChangePercent),
          },
        ],
      });
    }

    const encoded = encodeURIComponent(JSON.stringify(symbolList));
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${encoded}`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Binance error", status: res.status },
        { status: 502 },
      );
    }

    const tickers = (await res.json()) as Array<{
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
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch Binance tickers" },
      { status: 502 },
    );
  }
}
