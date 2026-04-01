/**
 * GET /api/funding-arb
 *
 * Read-only endpoint for funding arbitrage opportunities.
 * Returns cross-exchange and spot-futures funding rate data.
 *
 * DISCLAIMER:
 * - This endpoint returns ANALYSIS data only.
 * - No automated trading is performed.
 * - No API keys for order execution are used or stored.
 * - Historical returns (3-12% APY) are not guarantees of future performance.
 */

import { NextResponse } from 'next/server';
import { getFundingRateSnapshot } from '@/lib/futures/funding-rates';
import {
  identifyCrossExchangeArbitrage,
  getHistoricalArbitragePerformance,
} from '@/lib/futures/cross-exchange-arb';

export const dynamic = 'force-dynamic';

interface FundingArbResponse {
  /** ISO timestamp when data was fetched */
  fetchedAt: string;

  /** Spot-futures arbitrage opportunities from Binance */
  spotFuturesOpportunities: Array<{
    symbol: string;
    fundingRate: number;
    annualizedReturn: number;
    direction: string;
    riskLevel: 'low' | 'medium' | 'high';
    explanation: string;
  }>;

  /** Cross-exchange opportunities (Binance + mock Bybit/OKX) */
  crossExchangeOpportunities: Array<{
    symbol: string;
    longExchange: string;
    shortExchange: string;
    netRate: number;
    estimatedAnnual: number;
    riskLevel: 'low' | 'medium' | 'high';
  }>;

  /** Historical performance metrics (simulated/backtested) */
  historicalPerformance: {
    period: string;
    avgAnnualReturn: number;
    maxDrawdown: number;
    winRate: number;
    bestMonth: number;
    worstMonth: number;
    /** Important disclaimer about historical data */
    disclaimer: string;
  };

  /** Market sentiment based on average funding rates */
  marketSentiment: 'bullish' | 'bearish' | 'neutral';

  /** Disclaimers that must be displayed to users */
  disclaimers: string[];
}

/**
 * GET handler for funding arbitrage data.
 *
 * @returns JSON response with opportunities and disclaimers.
 * @throws Never throws; errors return 500 with generic message.
 */
export async function GET(): Promise<NextResponse<FundingArbResponse | { error: string }>> {
  try {
    // Fetch spot-futures data from Binance (public API)
    const spotFuturesSnapshot = await getFundingRateSnapshot();

    // Fetch cross-exchange opportunities (Binance + mock data)
    const crossExchangeOpps = await identifyCrossExchangeArbitrage();

    // Get historical performance metrics
    const historical = getHistoricalArbitragePerformance();

    const response: FundingArbResponse = {
      fetchedAt: spotFuturesSnapshot.fetchedAt,
      spotFuturesOpportunities: spotFuturesSnapshot.opportunities.map((opp) => ({
        symbol: opp.symbol,
        fundingRate: opp.fundingRate,
        annualizedReturn: opp.annualizedReturn,
        direction: opp.direction,
        riskLevel: opp.riskLevel,
        explanation: opp.explanation,
      })),
      crossExchangeOpportunities: crossExchangeOpps.map((opp) => ({
        symbol: opp.symbol,
        longExchange: opp.longExchange,
        shortExchange: opp.shortExchange,
        netRate: opp.netRate,
        estimatedAnnual: opp.estimatedAnnual,
        riskLevel: opp.riskLevel,
      })),
      historicalPerformance: {
        ...historical,
        disclaimer:
          'Historical performance is based on backtested data (Jan 2024 - Mar 2026). ' +
          'Actual results may vary significantly. Past performance does not guarantee future returns.',
      },
      marketSentiment: spotFuturesSnapshot.marketSentiment,
      disclaimers: [
        'Historical returns (3-12% APY) are estimates based on past data. No guarantee of future performance.',
        'Funding arbitrage involves risks: exchange failure, basis risk, margin calls, and regulatory changes.',
        'This tool provides analysis only. No automated execution is performed.',
        'Users must manually execute trades on their own exchange accounts.',
        'Cryptocurrency investments carry significant risk of loss. Only invest what you can afford to lose.',
      ],
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[funding-arb] Error fetching data:', error);

    // Generic error message to avoid leaking implementation details
    return NextResponse.json(
      { error: 'Unable to fetch funding arbitrage data. Please try again later.' },
      { status: 500 }
    );
  }
}
