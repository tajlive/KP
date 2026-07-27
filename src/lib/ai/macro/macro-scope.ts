/**
 * MacroScope — Global makro-overvåking for krypto-regime-deteksjon.
 *
 * Korrelerer krypto med tradisjonelle markeder:
 * - S&P 500: Risk appetite proxy
 * - DXY: Inverse BTC correlation
 * - Gold: Safe haven comparison
 * - VIX: Fear gauge
 * - Fed Funds Rate: Liquidity environment
 */

export interface MacroSnapshot {
  timestamp: Date;
  sp500: number;
  nasdaq: number;
  dxy: number;
  gold: number;
  vix: number;
  fedRate: number;
  btcDominance: number;
  // Derived
  btcSp500Correlation: number; // 30d rolling
  riskOn: boolean;
}

/** Hent siste makro-data */
export async function getMacroSnapshot(): Promise<MacroSnapshot> {
  const [sp500, dxy, gold, vix, btc] = await Promise.allSettled([
    fetchIndex("^GSPC"), // S&P 500
    fetchIndex("DX-Y.NYB"), // DXY
    fetchIndex("GC=F"), // Gold
    fetchIndex("^VIX"), // VIX
    fetchBTCData(),
  ]);

  const sp500Val = getValue(sp500);
  const dxyVal = getValue(dxy);
  const goldVal = getValue(gold);
  const vixVal = getValue(vix);
  const btcData = btc.status === "fulfilled" ? btc.value : null;

  return {
    timestamp: new Date(),
    sp500: sp500Val,
    nasdaq: 0, // Kan utvides
    dxy: dxyVal,
    gold: goldVal,
    vix: vixVal,
    fedRate: 5.25, // Placeholder — FRED API i produksjon
    btcDominance: btcData?.dominance ?? 50,
    btcSp500Correlation: 0.35, // Estimert — utvides med historisk data
    riskOn: vixVal < 25 && sp500Val > 0,
  };
}

async function fetchIndex(symbol: string): Promise<number> {
  try {
    // Bruk Yahoo Finance (uoffisiell, gratis)
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
    );

    if (!res.ok) return 0;

    const data = await res.json();
    const quote = data.chart?.result?.[0]?.indicators?.quote?.[0];
    const close = quote?.close;
    return close?.[close.length - 1] ?? 0;
  } catch {
    return 0;
  }
}

async function fetchBTCData(): Promise<{ price: number; dominance: number } | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/global"
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      price: data.data?.market_cap_percentage?.btc ?? 0,
      dominance: data.data?.market_cap_percentage?.btc ?? 50,
    };
  } catch {
    return null;
  }
}

function getValue(result: PromiseSettledResult<number>): number {
  return result.status === "fulfilled" ? result.value : 0;
}
