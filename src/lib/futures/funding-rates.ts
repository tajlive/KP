/**
 * Binance Futures Funding Rate Monitor - KLA-246
 *
 * Public API — no API keys required.
 * Fetches current funding rates from Binance USDⓈ-M Futures
 * and identifies delta-neutral arbitrage opportunities.
 *
 * DISCLAIMER:
 * - This module is for ANALYSIS only. No trading is performed.
 * - Historical returns are estimates, not guarantees.
 * - Funding arbitrage carries significant risks including exchange failure and basis risk.
 *
 * @module funding-rates
 * @see {@link getFundingRateSnapshot} for complete market data
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
 * Fetch current funding rates from Binance Futures (public, no auth required).
 *
 * Uses the Binance USDⓈ-M Futures API to get real-time funding rates.
 * This is a read-only operation. No trades are executed.
 *
 * @param symbols - Optional array of trading pairs (e.g., ['BTCUSDT', 'ETHUSDT'])
 * @returns Array of funding rate data sorted by absolute rate (highest first)
 * @throws Error if Binance API returns non-200 status
 * @see https://binance-docs.github.io/apidocs/futures/en/#mark-price
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
 *
 * Returns up to `limit` historical funding rate payments for analysis.
 * Useful for backtesting and volatility assessment.
 *
 * @param symbol - Trading pair (e.g., 'BTCUSDT')
 * @param limit - Number of historical records (default: 30, max: 1000)
 * @returns Array of historical funding rates with timestamps
 * @throws Error if Binance API returns non-200 status
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
 * Identify delta-neutral spot-futures arbitrage opportunities.
 *
 * Analyzes funding rates to find assets where the funding payment
 * exceeds a minimum threshold (8% annualized).
 *
 * Strategy:
 * - When funding is positive: longs pay shorts. Strategy: buy spot + short futures.
 * - When funding is negative: shorts pay longs. Strategy: short spot + long futures.
 * - In both cases you are delta-neutral (no price exposure) and earn the funding.
 *
 * IMPORTANT:
 * - This is analysis only. No trades are executed.
 * - Actual returns depend on execution quality, fees, and market conditions.
 * - Minimum threshold: 8% annualized (filters out noise).
 *
 * @param rates - Array of funding rate data from {@link getFundingRates}
 * @returns Array of opportunities sorted by absolute annualized return
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
 *
 * Returns a complete view of the current funding rate landscape,
 * including arbitrage opportunities and overall market sentiment.
 *
 * @param symbols - Optional array of trading pairs to include
 * @returns Complete funding rate snapshot with analysis
 * @throws Error if Binance API request fails
 * @example
 * const snapshot = await getFundingRateSnapshot();
 * console.log(`Market sentiment: ${snapshot.marketSentiment}`);
 * console.log(`Found ${snapshot.opportunities.length} opportunities`);
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
