/**
 * Binance Futures Funding Rate Monitor
 *
 * Public API — no API keys required.
 * Fetches current funding rates from Binance USDⓈ-M Futures
 * and identifies delta-neutral arbitrage opportunities.
 */

const FAPI_BASE = 'https://fapi.binance.com';

export interface FundingRateData {
  symbol: string;
  markPrice: number;
  indexPrice: number;
  lastFundingRate: number;
  nextFundingTime: number;
  annualizedRate: number;
  interestRate: number;
}

export interface ArbitrageOpportunity {
  symbol: string;
  fundingRate: number;
  annualizedReturn: number;
  direction: 'long_spot_short_futures' | 'short_spot_long_futures';
  riskLevel: 'low' | 'medium' | 'high';
  explanation: string;
}

export interface FundingRateSnapshot {
  fetchedAt: string;
  rates: FundingRateData[];
  opportunities: ArbitrageOpportunity[];
  avgRate: number;
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
}

const DEFAULT_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'AVAXUSDT', 'LINKUSDT',
  'LTCUSDT', 'UNIUSDT', 'ATOMUSDT', 'ETCUSDT',
];

/**
 * Fetch current funding rates from Binance Futures (public, no auth).
 */
export async function getFundingRates(
  symbols?: string[]
): Promise<FundingRateData[]> {
  const targetSymbols = symbols ?? DEFAULT_SYMBOLS;

  const res = await fetch(`${FAPI_BASE}/fapi/v1/premiumIndex`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Binance Futures API error: ${res.status}`);
  }

  const data: Array<{
    symbol: string;
    markPrice: string;
    indexPrice: string;
    lastFundingRate: string;
    nextFundingTime: number;
    interestRate: string;
  }> = await res.json();

  return data
    .filter((d) => targetSymbols.includes(d.symbol))
    .map((d) => {
      const rate = parseFloat(d.lastFundingRate);
      return {
        symbol: d.symbol,
        markPrice: parseFloat(d.markPrice),
        indexPrice: parseFloat(d.indexPrice),
        lastFundingRate: rate,
        nextFundingTime: d.nextFundingTime,
        interestRate: parseFloat(d.interestRate),
        // 3 payments/day × 365 days × 100 for percentage
        annualizedRate: rate * 3 * 365 * 100,
      };
    })
    .sort((a, b) => Math.abs(b.lastFundingRate) - Math.abs(a.lastFundingRate));
}

/**
 * Fetch historical funding rates for a specific symbol.
 */
export async function getFundingRateHistory(
  symbol: string,
  limit = 30
): Promise<Array<{ fundingTime: number; fundingRate: number }>> {
  const res = await fetch(
    `${FAPI_BASE}/fapi/v1/fundingRate?symbol=${symbol}&limit=${limit}`
  );

  if (!res.ok) {
    throw new Error(`Binance funding history error: ${res.status}`);
  }

  const data: Array<{ fundingTime: number; fundingRate: string }> =
    await res.json();

  return data.map((d) => ({
    fundingTime: d.fundingTime,
    fundingRate: parseFloat(d.fundingRate),
  }));
}

/**
 * Identify delta-neutral arbitrage opportunities.
 *
 * When funding is positive: longs pay shorts. Strategy: buy spot + short futures.
 * When funding is negative: shorts pay longs. Strategy: short spot + long futures.
 * In both cases you are delta-neutral (no price exposure) and earn the funding.
 */
export function identifyOpportunities(
  rates: FundingRateData[]
): ArbitrageOpportunity[] {
  const MIN_ANNUALIZED = 8;

  return rates
    .filter((r) => Math.abs(r.annualizedRate) > MIN_ANNUALIZED)
    .map((r) => {
      const absAnnualized = Math.abs(r.annualizedRate);
      const isPositive = r.lastFundingRate > 0;

      let riskLevel: 'low' | 'medium' | 'high';
      if (absAnnualized < 20) riskLevel = 'low';
      else if (absAnnualized < 40) riskLevel = 'medium';
      else riskLevel = 'high';

      const direction: ArbitrageOpportunity['direction'] = isPositive
        ? 'long_spot_short_futures'
        : 'short_spot_long_futures';

      const directionNorsk = isPositive
        ? 'Kjøp spot + short futures'
        : 'Short spot + long futures';

      return {
        symbol: r.symbol,
        fundingRate: r.lastFundingRate,
        annualizedReturn: r.annualizedRate,
        direction,
        riskLevel,
        explanation:
          `${r.symbol}: Funding rate ${(r.lastFundingRate * 100).toFixed(4)}% ` +
          `(~${absAnnualized.toFixed(1)}% p.a.). ` +
          `${directionNorsk} for delta-nøytral inntjening.`,
      };
    })
    .sort((a, b) => Math.abs(b.annualizedReturn) - Math.abs(a.annualizedReturn));
}

/**
 * Full snapshot: rates + opportunities + market sentiment.
 */
export async function getFundingRateSnapshot(
  symbols?: string[]
): Promise<FundingRateSnapshot> {
  const rates = await getFundingRates(symbols);
  const opportunities = identifyOpportunities(rates);

  const avgRate =
    rates.length > 0
      ? rates.reduce((sum, r) => sum + r.lastFundingRate, 0) / rates.length
      : 0;

  let marketSentiment: 'bullish' | 'bearish' | 'neutral';
  if (avgRate > 0.0003) marketSentiment = 'bullish';
  else if (avgRate < -0.0003) marketSentiment = 'bearish';
  else marketSentiment = 'neutral';

  return {
    fetchedAt: new Date().toISOString(),
    rates,
    opportunities,
    avgRate,
    marketSentiment,
  };
}
