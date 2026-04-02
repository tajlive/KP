/**
 * POST /api/ai/ensemble
 * Returns ensemble AI signal for a given symbol
 * KLA-PROFIT1
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateEnsembleSignal } from '@/lib/ai/ensemble-engine';
import { fetchHistoricalData } from '@/lib/backtest/engine';
import { z } from 'zod';

const RequestSchema = z.object({
  symbol: z.string().regex(/^[A-Z]{3,10}USDT$/).default('BTCUSDT'),
  riskProfile: z.enum(['conservative', 'balanced', 'aggressive']).default('balanced'),
  confidenceThreshold: z.number().min(0).max(100).optional(),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { symbol, riskProfile, confidenceThreshold } = parsed.data;

    const candles = await fetchHistoricalData(symbol, '1h', 100);
    if (!candles || candles.length < 50) {
      return NextResponse.json(
        { error: 'Insufficient price data' },
        { status: 400 }
      );
    }
    const prices = candles.map((c) => c.close);

    const signal = await generateEnsembleSignal({
      symbol,
      prices,
      riskProfile,
      useLLM: true,
    });

    const shouldExecute =
      confidenceThreshold !== undefined
        ? signal.confidence >= confidenceThreshold
        : signal.confidence >= 80;

    return NextResponse.json({
      ...signal,
      execute: shouldExecute,
    });
  } catch (error) {
    console.error('[API /ai/ensemble] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
