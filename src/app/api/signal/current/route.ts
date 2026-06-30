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
import { createBinanceMarketDataProvider } from '@/lib/trading/canonical/market-data';

// ...

// Validation schema for query params
const QuerySchema = z.object({
  symbol: z.string().min(1).max(20).default('BTC'),
  strategy: z.string().min(1).max(50).default('multisignal_aktiv'),
});

/**
 * Henter priser fra Binance public API (api.binance.com med failover).
 * Bruker 50 siste 1h-lys for reell OHLC-historikk.
 */
async function fetchPrices(symbol: string): Promise<number[]> {
  const provider = createBinanceMarketDataProvider();
  const klines = await provider.getKlines(symbol.toUpperCase(), '1h', 50);

  if (!klines || klines.length === 0) {
    throw new Error(`Ingen prisdata tilgjengelig for ${symbol}`);
  }

  const prices = klines.map((k) => k.close);

  // Siste punkt er alltid siste close
  if (prices.length < 50) {
    // Hvis færre enn 50, fyll ut med første verdi foran
    while (prices.length < 50) {
      prices.unshift(prices[0]);
    }
  }

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
