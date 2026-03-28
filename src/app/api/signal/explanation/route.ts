/**
 * POST /api/signal/explanation
 * Generates human-readable explanation for a trading signal
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { explainSignalWithFallback } from '@/lib/ai/sonar';
import type { ExplainSignalInput, ExplainSignalResult } from '@/lib/ai/sonar';
import { logger } from '@/lib/logger';
import { logExplanationGeneration } from '@/lib/ai/sonar/metrics';

// Validation schema for request body
const RequestSchema = z.object({
  symbol: z.string().min(1).max(20),
  timeframe: z.enum(['short', 'medium', 'long']).default('medium'),
  decision: z.enum(['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL']),
  score: z.number().min(0).max(100),
  risk_level: z.number().int().min(1).max(5).default(3),
  factors: z.record(z.string(), z.number()).default({}),
  userRiskProfile: z
    .enum(['conservative', 'balanced', 'aggressive'])
    .default('balanced'),
  locale: z.literal('nb-NO').default('nb-NO'),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const parseResult = RequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    logger.info(
      `[Signal Explanation API] [${requestId}] Generating explanation for ${data.symbol} (${data.decision})`
    );

    // Build input for explanation
    const input: ExplainSignalInput = {
      symbol: data.symbol,
      timeframe: data.timeframe,
      decision: data.decision,
      score: data.score,
      risk_level: data.risk_level as 1 | 2 | 3 | 4 | 5,
      factors: data.factors,
      userRiskProfile: data.userRiskProfile,
      locale: data.locale,
    };

    // Generate explanation
    const explanation = await explainSignalWithFallback(input, {
      tier: 'sonar',
      mode: 'medium',
    });

    const duration = Date.now() - startTime;
    logger.info(
      `[Signal Explanation API] [${requestId}] Explanation generated in ${duration}ms`
    );

    // Log metrics
    logExplanationGeneration({
      symbol: data.symbol,
      decision: data.decision,
      durationMs: duration,
      success: true,
      cached: false, // TODO: Track cache hits
    });

    // Build response
    const response: ExplainSignalResult & {
      _meta: {
        requestId: string;
        durationMs: number;
        cached: boolean;
        timestamp: string;
      };
    } = {
      ...explanation,
      _meta: {
        requestId,
        durationMs: duration,
        cached: false, // TODO: Track cache hits
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      `[Signal Explanation API] [${requestId}] Error after ${duration}ms:`,
      error
    );

    // Log error metrics
    logExplanationGeneration({
      symbol: 'UNKNOWN',
      decision: 'UNKNOWN',
      durationMs: duration,
      success: false,
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Kunne ikke generere forklaring',
        message:
          error instanceof Error ? error.message : 'En uventet feil oppstod',
        _meta: {
          requestId,
          durationMs: duration,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/signal/explanation
 * Returns a sample/template for the explanation request format
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    description: 'POST to this endpoint to generate signal explanations',
    exampleRequest: {
      symbol: 'BTC',
      timeframe: 'medium',
      decision: 'BUY',
      score: 75,
      risk_level: 3,
      factors: {
        trend: 0.8,
        volatility: 0.4,
        ai_signal: 0.75,
        narrative_sentiment: 0.5,
        event_risk: 0.2,
      },
      userRiskProfile: 'balanced',
      locale: 'nb-NO',
    },
    exampleResponse: {
      title: 'Kjøpssignal for Bitcoin',
      summary:
        'Tekniske indikatorer viser positiv momentum. Trenden er stigende.',
      key_points: [
        'SMA-kryssing indikerer oppgang',
        'RSI er på moderat nivå',
        'Markedsregime er bull',
      ],
      risk_warnings: [
        'Trading er risikofullt. Du kan tape penger.',
        'Historisk avkastning er ingen garanti.',
      ],
      sources: [{ title: 'Teknisk Analyse', url: 'https://example.com' }],
    },
  });
}
