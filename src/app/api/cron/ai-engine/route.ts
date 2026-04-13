/**
 * CRON /api/cron/ai-engine
 * KLA-PROFIT1: Daily Ensemble AI Signal Generation
 *
 * Runs every hour, generates ensemble signals for top symbols,
 * stores them in ai_decision_log, and triggers auto-trade if enabled.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateEnsembleSignalsBatch } from '@/lib/ai/ensemble-engine';
import { fetchHistoricalData } from '@/lib/backtest/engine';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TOP_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'ADAUSDT',
  'XRPUSDT',
  'DOTUSDT',
  'LINKUSDT',
  'AVAXUSDT',
  'MATICUSDT',
  'DOGEUSDT',
];

export async function GET(req: NextRequest) {
  // Auth check
  const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '');
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev && cronSecret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = (await createClient()) as SupabaseClient<Database>;
  const startTime = Date.now();
  const results: { symbol: string; status: string; confidence?: number; error?: string }[] = [];

  try {
    // Fetch price data for all symbols concurrently
    const priceMap = new Map<string, number[]>();
    await Promise.all(
      TOP_SYMBOLS.map(async (symbol) => {
        try {
          const candles = await fetchHistoricalData(symbol, '1h', 100);
          if (candles && candles.length >= 50) {
            priceMap.set(symbol, candles.map((c) => c.close));
          }
        } catch (err) {
          console.warn(`[Cron AI-Engine] Failed to fetch prices for ${symbol}:`, err);
        }
      })
    );

    const batchResults = await generateEnsembleSignalsBatch(
      Array.from(priceMap.keys()),
      (sym) => priceMap.get(sym) ?? [],
      { riskProfile: 'balanced', useLLM: true }
    );

    for (const item of batchResults) {
      if (!item.signal) {
        results.push({ symbol: item.symbol, status: 'skipped', error: item.error });
        continue;
      }

      const signal = item.signal;

      // Persist to ai_decision_log
      // TODO: KLA-XXX Legg til riktig user_id fra autentisert kontekst
      const { error: insertError } = await db.from('ai_decision_log').insert({
        symbol: signal.symbol,
        decision_type: signal.action,
        sentiment_score: Math.round(signal.confidence),
        analysis_data: {
          ensemble: true,
          scores: signal.scores,
          indicators: signal.indicators,
          sizing: signal.sizing,
          metadata: signal.metadata,
        } as any as import('@/types/database.types').Json,
        decision_reason: signal.reasoning,
        executed_at: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      if (insertError) {
        console.error(`[Cron AI-Engine] DB insert error for ${signal.symbol}:`, insertError);
        results.push({ symbol: signal.symbol, status: 'db_error', error: insertError.message });
        continue;
      }

      results.push({
        symbol: signal.symbol,
        status: signal.confidence >= 80 ? 'executed' : 'logged',
        confidence: signal.confidence,
      });

      // If confidence >= 80 and auto-trade is enabled for any session, we leave that to the tick engine
      // which reads ai_decision_log separately.
    }

    return NextResponse.json({
      success: true,
      durationMs: Date.now() - startTime,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('[Cron AI-Engine] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
