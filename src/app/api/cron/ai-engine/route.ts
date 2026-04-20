import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runEnsembleForSymbol } from '@/lib/ai/ensemble-v2';
import { captureCronError, captureCronSuccess } from '@/lib/cron/cron-helpers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// System user for AI-generated signals. All active auto-traders
// read from ai_decision_log regardless of user_id, but FK requires a valid UUID.
const SYSTEM_SIGNAL_USER_ID = '6408d389-2021-4a2f-92b6-bebf0459a398';

async function fetchHourlyCandles(symbol: string, limit = 100) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Binance API error: ${res.status} for ${symbol}`);
  const data = await res.json() as [number, string, string, string, string, string][];
  return data.map((c) => ({
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}

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
    const volumeMap = new Map<string, number[]>();
    await Promise.all(
      TOP_SYMBOLS.map(async (symbol) => {
        try {
          const candles = await fetchHourlyCandles(symbol, 100);
          if (candles && candles.length >= 50) {
            priceMap.set(symbol, candles.map((c) => c.close));
            volumeMap.set(symbol, candles.map((c) => c.volume));
          }
        } catch (err) {
          console.warn(`[Cron AI-Engine] Failed to fetch prices for ${symbol}:`, err);
        }
      })
    );

    for (const symbol of Array.from(priceMap.keys())) {
      try {
        const prices = priceMap.get(symbol) ?? [];
        const volumes = volumeMap.get(symbol);
        const lastPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
        const asOf = new Date().toISOString();

        // 1) Persist features to ai_feature_store
        const featuresPayload = {
          symbol,
          timeframe: '1h',
          as_of: asOf,
          features: {
            prices: prices.slice(-20),
            volume_avg_20: volumes && volumes.length >= 20
              ? volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
              : null,
          } as unknown as import('@/types/database.types').Json,
          source: 'binance_spot',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
        const { error: featErr } = await db.from('ai_feature_store').insert(featuresPayload);
        if (featErr) {
          console.warn(`[Cron AI-Engine] feature_store insert warning for ${symbol}:`, featErr.message);
        }

        // 2) Run multi-agent ensemble
        const consensus = await runEnsembleForSymbol(db, symbol, prices, volumes, {
          modelVersion: 'ensemble-v2',
          featureVersion: '1h-basic',
        });

        // 3) Persist to ai_decision_log (legacy observability)
        const { error: insertError } = await db.from('ai_decision_log').insert({
          symbol,
          decision_type: consensus.action.toUpperCase(),
          sentiment_score: Math.round(consensus.confidence),
          analysis_data: {
            ensemble: true,
            ensemble_run_id: consensus.runId,
            current_price: lastPrice,
            agents: consensus.agentResults.map((a) => ({
              id: a.agent.id,
              weight: a.adjustedWeight,
              action: a.signal.action,
              confidence: a.signal.confidence,
            })),
          } as unknown as import('@/types/database.types').Json,
          decision_reason: consensus.reasoning,
          user_id: SYSTEM_SIGNAL_USER_ID,
          executed_at: asOf,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        if (insertError) {
          console.error(`[Cron AI-Engine] DB insert error for ${symbol}:`, insertError);
          results.push({ symbol, status: 'db_error', error: insertError.message });
          continue;
        }

        // 4) Write agent rows to trading_signals
        for (const ar of consensus.agentResults) {
          if (ar.signal.action === 'buy' || ar.signal.action === 'sell') {
            const { error: agentSignalErr } = await db.from('trading_signals').insert({
              symbol,
              action: ar.signal.action,
              confidence: Math.round(ar.signal.confidence),
              entry_price: lastPrice,
              reasoning: ar.signal.reasoning,
              signal_type: 'ensemble_ai',
              status: 'active',
              ensemble_run_id: consensus.runId,
              agent_id: ar.agent.id,
              agent_weight: ar.adjustedWeight,
              model_version: 'ensemble-v2',
              feature_version: '1h-basic',
              agent_meta: ar.signal.meta as unknown as import('@/types/database.types').Json,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);
            if (agentSignalErr) {
              console.error(`[Cron AI-Engine] agent signal insert error for ${symbol}:`, agentSignalErr);
            }
          }
        }

        // 5) Write master consensus row to trading_signals (what tick will read)
        if (consensus.action === 'buy' || consensus.action === 'sell') {
          const { error: masterSignalErr } = await db.from('trading_signals').insert({
            symbol,
            action: consensus.action,
            confidence: Math.round(consensus.confidence),
            entry_price: lastPrice,
            reasoning: consensus.reasoning,
            signal_type: 'ensemble_ai',
            status: 'active',
            ensemble_run_id: consensus.runId,
            agent_id: 'ensemble_master',
            agent_weight: 1.0,
            model_version: 'ensemble-v2',
            feature_version: '1h-basic',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any);
          if (masterSignalErr) {
            console.error(`[Cron AI-Engine] master signal insert error for ${symbol}:`, masterSignalErr);
          }
        }

        results.push({
          symbol,
          status: consensus.confidence >= 65 ? 'executed' : 'logged',
          confidence: consensus.confidence,
        });
      } catch (symbolErr) {
        const err = symbolErr instanceof Error ? symbolErr : new Error(String(symbolErr));
        console.error(`[Cron AI-Engine] Error processing ${symbol}:`, err);
        results.push({ symbol, status: 'error', error: err.message });
      }
    }

    const durationMs = Date.now() - startTime;
    await captureCronSuccess('ai-engine', new Date(startTime), new Date());

    return NextResponse.json({
      success: true,
      durationMs,
      processed: results.length,
      results,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[Cron AI-Engine] Fatal error:', err);
    captureCronError('ai-engine', err, { durationMs: Date.now() - startTime });
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Also support POST for pg_cron triggering
export const POST = GET;
