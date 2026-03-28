/**
 * GET /api/signal/current
 * Returns current confluent signal for a symbol with Sonar AI analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  generateConfluentSignal,
  type ConfluentSignal,
} from '@/lib/trading/confluent-signal-engine';
import { logger } from '@/lib/logger';
import { logSignalGeneration } from '@/lib/ai/sonar/metrics';
import { getMarketData } from '@/lib/ai/market-data';

// Validation schema for query params
const QuerySchema = z.object({
  symbol: z.string().min(1).max(20).default('BTC'),
  strategy: z.string().min(1).max(50).default('multisignal_aktiv'),
});

/**
 * Henter reelle priser fra CoinLore (gratis, sanntid).
 * Bygger en 50-punkts prisserie forankret til faktisk markedspris.
 * TODO P1: Erstatt med Binance Klines API for ekte OHLC-historikk.
 */
async function fetchPrices(symbol: string): Promise<number[]> {
  const coins = await getMarketData([symbol.toUpperCase()]);
  const coin = coins[0];

  if (!coin || !coin.price_usd) {
    throw new Error(`Ingen prisdata tilgjengelig for ${symbol}`);
  }

  const currentPrice = parseFloat(coin.price_usd);
  const change24h = parseFloat(coin.percent_change_24h) / 100 || 0;

  if (!isFinite(currentPrice) || currentPrice <= 0) {
    throw new Error(`Ugyldig prisdata for ${symbol}: ${coin.price_usd}`);
  }

  // Bygg 50-punkts prisserie: fra pris 24t siden → nåværende pris
  const price24hAgo = currentPrice / (1 + change24h);
  const prices: number[] = [];

  for (let i = 0; i < 50; i++) {
    const t = i / 49;
    const baseAtT = price24hAgo + (currentPrice - price24hAgo) * t;
    // Svak støy < 0.05% per punkt
    const noise = (Math.random() - 0.5) * baseAtT * 0.0005;
    prices.push(Math.max(0, baseAtT + noise));
  }
  prices[49] = currentPrice; // Siste punkt er alltid faktisk pris

  return prices;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const parseResult = QuerySchema.safeParse({
      symbol: searchParams.get('symbol') || undefined,
      strategy: searchParams.get('strategy') || undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { symbol, strategy } = parseResult.data;

    logger.info(
      `[Signal API] [${requestId}] Generating signal for ${symbol} (${strategy})`
    );

    // Hent reelle priser – returner 503 hvis prisfeeden er nede
    let prices: number[];
    try {
      prices = await fetchPrices(symbol);
    } catch (priceError) {
      logger.error(
        `[Signal API] [${requestId}] Price feed error for ${symbol}:`,
        priceError
      );
      return NextResponse.json(
        {
          error: 'Prisdata ikke tilgjengelig',
          message:
            priceError instanceof Error
              ? priceError.message
              : 'Kunne ikke hente markedspriser',
          requestId,
        },
        { status: 503 }
      );
    }

    // Generate confluent signal
    const signal = await generateConfluentSignal({
      symbol,
      strategyType: strategy,
      prices,
      includeNarrative: true,
      includeRegime: true,
    });

    const duration = Date.now() - startTime;
    logger.info(
      `[Signal API] [${requestId}] Signal generated in ${duration}ms for ${symbol}`
    );

    // Log metrics
    logSignalGeneration({
      symbol,
      strategy,
      durationMs: duration,
      hasNarrative: signal.factors.narrative_sentiment !== undefined,
      hasRegime: signal.factors.market_regime !== undefined,
      usedFallback: signal.metadata.usedFallback,
      score: signal.score,
    });

    // Build response with all metadata
    const response: ConfluentSignal & {
      _meta: {
        requestId: string;
        durationMs: number;
        symbol: string;
        strategy: string;
        timestamp: string;
      };
    } = {
      ...signal,
      _meta: {
        requestId,
        durationMs: duration,
        symbol,
        strategy,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      `[Signal API] [${requestId}] Error after ${duration}ms:`,
      error
    );

    // Log error metrics
    logSignalGeneration({
      symbol: 'UNKNOWN',
      strategy: 'unknown',
      durationMs: duration,
      hasNarrative: false,
      hasRegime: false,
      usedFallback: true,
      score: 50,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Return a fallback signal
    const fallbackSignal: ConfluentSignal & {
      _meta: {
        requestId: string;
        durationMs: number;
        error: string;
        timestamp: string;
      };
    } = {
      action: 'HOLD',
      reason: 'Kunne ikke generere signal akkurat nå. Prøv igjen om litt.',
      score: 50,
      riskLevel: 3,
      factors: {
        trend: 0.5,
        volatility: 0.5,
        ai_signal: 0.5,
      },
      metadata: {
        usedFallback: true,
      },
      _meta: {
        requestId,
        durationMs: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(fallbackSignal, {
      status: 200, // Return 200 with fallback
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  }
}
