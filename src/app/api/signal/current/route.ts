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

// Validation schema for query params
const QuerySchema = z.object({
  symbol: z.string().min(1).max(20).default('BTC'),
  strategy: z.string().min(1).max(50).default('multisignal_aktiv'),
});

// Mock price fetcher - in production, this would fetch from your data provider
async function fetchPrices(symbol: string): Promise<number[]> {
  // In a real implementation, fetch from Binance, CoinGecko, etc.
  // For now, generate synthetic data for testing
  const basePrice = symbol === 'BTC' ? 65000 : symbol === 'ETH' ? 3500 : 100;
  const prices: number[] = [];
  let currentPrice = basePrice;

  for (let i = 0; i < 50; i++) {
    const change = (Math.random() - 0.48) * 0.02; // Slight upward bias
    currentPrice = currentPrice * (1 + change);
    prices.push(currentPrice);
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

    // Fetch price data
    const prices = await fetchPrices(symbol);

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
