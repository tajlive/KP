import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { usdtPriceToNok } from "@/lib/market/nok";
import { createKrakenMarketDataProvider } from "@/lib/trading/canonical/market-data";

export const runtime = 'nodejs';
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

// EU/EØS (2026): Kun Kraken-støttede par (USDC-kvote). BNB var
// Coin og finnes ikke på Kraken — fjernet.
const ASSETS = [
  { symbol: "BTCUSDT", name: "Bitcoin" },
  { symbol: "ETHUSDT", name: "Ethereum" },
  { symbol: "SOLUSDT", name: "Solana" },
  { symbol: "ADAUSDT", name: "Cardano" },
  { symbol: "DOTUSDT", name: "Polkadot" },
  { symbol: "LINKUSDT", name: "Chainlink" },
];

/**
 * Sanntids USDT/NOK-rate fra global_settings (samme kilde som
 * /api/fx/usdt-nok). Faller tilbake til FALLBACK_USDT_NOK i nok.ts.
 */
async function getUsdtNokRate(): Promise<number | undefined> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("global_settings")
      .select("usdt_nok_rate")
      .eq("id", 1)
      .maybeSingle();
    const rate = Number(data?.usdt_nok_rate);
    return Number.isFinite(rate) && rate > 0 ? rate : undefined;
  } catch {
    return undefined;
  }
}

export async function GET() {
  const rate = await getUsdtNokRate();
  const provider = createKrakenMarketDataProvider();

  // Kraken Ticker (public REST) — ett kall per symbol, Promise.all i parallell.
  try {
    const snapshots = await Promise.all(
      ASSETS.map((asset) =>
        provider
          .get24hSnapshot(asset.symbol)
          .then((s) => ({ asset, ...s }))
          .catch((err: unknown) => {
            console.warn(
              `[market/snapshot] Kraken feilet for ${asset.symbol}:`,
              err instanceof Error ? err.message : err,
            );
            return null;
          }),
      ),
    );

    const assets: MarketSnapshot["assets"] = snapshots
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map(({ asset, price, change24hPct, high24h, low24h, volume24h }) => ({
        symbol: asset.name,
        name: asset.name,
        price: usdtPriceToNok(price, rate),
        change24hPct,
        high24h: usdtPriceToNok(high24h, rate),
        low24h: usdtPriceToNok(low24h, rate),
        volume24h,
      }));

    if (assets.length === 0) {
      return NextResponse.json(
        { error: "No market data available" },
        { status: 503 },
      );
    }

    const snapshot: MarketSnapshot = {
      assets,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error("[market/snapshot] Kraken feilet totalt:", err);
    // ALDRI hardkodede priser her — fabrikkerte tall med fersk tidsstempel
    // er verre enn ingen data (tickeren skjuler seg ved 503).
    return NextResponse.json(
      { error: "Market data temporarily unavailable" },
      { status: 503 },
    );
  }
}
