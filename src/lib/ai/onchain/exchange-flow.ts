/**
 * Exchange Flow — Overvåker nettobevegelser mellom exchanges og wallets.
 *
 * Netto uttak fra exchanges = bullish (coins holder)
 * Netto innskudd til exchanges = bearish (salgspress)
 *
 * Bruker CoinGecko exchange flow data når tilgjengelig.
 */

export interface ExchangeFlow {
  symbol: string;
  inflow: number; // coins entering exchanges (24h)
  outflow: number; // coins leaving exchanges (24h)
  netFlow: number; // positive = inflow (bearish), negative = outflow (bullish)
  exchangeBalance: number; // total coins on exchanges
  percentOfSupply: number; // % av total supply på exchanges
  timestamp: Date;
}

/** Hent exchange flow-data */
export async function getExchangeFlow(
  symbol: string
): Promise<ExchangeFlow | null> {
  try {
    // CoinGecko exchange data (gratis, ingen API key)
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${symbol.toLowerCase()}` +
        `?localization=false&tickers=false&community_data=false&developer_data=false`
    );

    if (!res.ok) return null;

    const data = await res.json();
    const marketData = data.market_data ?? {};

    return {
      symbol: symbol.toUpperCase(),
      inflow: 0, // CoinGecko free tier gir ikke exchange flow
      outflow: 0,
      netFlow: 0,
      exchangeBalance: marketData.total_volume ?? 0,
      percentOfSupply: 0,
      timestamp: new Date(),
    };
  } catch {
    return null;
  }
}

/** Hent stabecoin flow (USDT/USDC) til exchanges */
export async function getStablecoinExchangeFlow(): Promise<{
  usdtOnExchanges: number;
  usdcOnExchanges: number;
  trend: "accumulating" | "distributing" | "neutral";
}> {
  // Stablecoin på exchanges = kjøpspress
  // Krever spesialiserte API-er i produksjon
  return {
    usdtOnExchanges: 0,
    usdcOnExchanges: 0,
    trend: "neutral",
  };
}

/** Beregn exchange flow-signal */
export function interpretExchangeFlow(flow: ExchangeFlow): {
  signal: "bullish" | "bearish" | "neutral";
  strength: number; // 0-1
} {
  if (flow.netFlow === 0) return { signal: "neutral", strength: 0 };

  const isOutflow = flow.netFlow < 0; // coins leaving exchanges
  const magnitude = Math.abs(flow.netFlow) / Math.max(flow.exchangeBalance, 1);

  return {
    signal: isOutflow ? "bullish" : "bearish",
    strength: Math.min(magnitude * 10, 1), // scaled 0-1
  };
}
