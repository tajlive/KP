import { NextResponse } from "next/server";
import { fetchViaProxy } from "@/lib/trading/canonical/market-data/binance-proxy-provider";
import { createClient } from "@/lib/supabase/server";
import { usdtPriceToNok } from "@/lib/market/nok";

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

const ASSETS = [
  { symbol: "BTCUSDT", name: "Bitcoin" },
  { symbol: "ETHUSDT", name: "Ethereum" },
  { symbol: "SOLUSDT", name: "Solana" },
  { symbol: "BNBUSDT", name: "BNB" },
  { symbol: "XRPUSDT", name: "XRP" },
];

interface Binance24hRow {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
}

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

/** Binance-rader (USDT) -> snapshot-assets i NOK. Priser konverteres ALLTID. */
function mapRows(rows: Binance24hRow[], rate?: number): MarketSnapshot["assets"] {
  return rows.map((row) => {
    const meta = ASSETS.find((a) => a.symbol === row.symbol);
    return {
      symbol: meta?.name ?? row.symbol,
      name: meta?.name ?? row.symbol,
      price: usdtPriceToNok(parseFloat(row.lastPrice), rate),
      change24hPct: parseFloat(row.priceChangePercent),
      high24h: usdtPriceToNok(parseFloat(row.highPrice), rate),
      low24h: usdtPriceToNok(parseFloat(row.lowPrice), rate),
      volume24h: parseFloat(row.volume),
    };
  });
}

export async function GET() {
  const symbolsParam = encodeURIComponent(
    JSON.stringify(ASSETS.map((a) => a.symbol))
  );
  const rate = await getUsdtNokRate();

  // 1) Direkte Binance (blokkeres ofte fra Cloudflare Worker-IPer)
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`,
      {
        next: { revalidate: 30 },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      console.warn(`[market/snapshot] Binance non-OK: ${res.status}`);
      throw new Error(`Binance ${res.status}`);
    }

    const rows = (await res.json()) as Binance24hRow[];
    const snapshot: MarketSnapshot = {
      assets: mapRows(rows, rate),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.warn("[market/snapshot] Direkte Binance feilet, prøver proxy:", err);
  }

  // 2) Supabase Edge Function binance-proxy (omgår Worker IP-blokk).
  //    ALDRI hardkodede priser her — fabrikkerte tall med fersk tidsstempel
  //    er verre enn ingen data (tickeren skjuler seg ved 503).
  try {
    const rows = (await fetchViaProxy(
      `/api/v3/ticker/24hr?symbols=${symbolsParam}`
    )) as Binance24hRow[];

    const snapshot: MarketSnapshot = {
      assets: mapRows(rows, rate),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (proxyErr) {
    console.error("[market/snapshot] Proxy feilet også:", proxyErr);
    return NextResponse.json(
      { error: "Markedsdata utilgjengelig" },
      { status: 503 }
    );
  }
}
