import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runEnsembleForSymbol } from '@/lib/ai/ensemble-v2';
import { captureCronError, captureCronSuccess } from '@/lib/cron/cron-helpers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { validateCronSecret } from "@/lib/auth/cron";

// System user for AI-generated signals. All active auto-traders
// read from ai_decision_log regardless of user_id, but FK requires a valid UUID.
// NOTE 2026-08-01: gammel ID (6408d389-…) fantes IKKE i auth.users → FK-feil
// på hver insert. Erstattet med systembrukeren algo1@klarpakke.no.
const SYSTEM_SIGNAL_USER_ID = 'b0700000-0000-0000-0000-000000000001';

import { createKrakenMarketDataProvider } from "@/lib/trading/canonical/market-data";

// OPTIMIZED: Only fetch 55 candles — computeFeatures needs max 50 (SMA50)
// Saves 45% of klines API weight vs 100 candles
// EU/EØS (2026): Kraken public API — eneste tallkilde.
async function fetchCandles(symbol: string, interval: string, limit = 55) {
  const provider = createKrakenMarketDataProvider();
  const klines = await provider.getKlines(symbol, interval, limit);
  return klines.map((k) => ({
    open: k.open,
    high: k.high,
    low: k.low,
    close: k.close,
    volume: k.volume,
  }));
}

/**
 * Multi-timeframe trend filter.
 * Research: Professional traders use 4h trend to filter 1h signals.
 * Buy signals in a 4h downtrend are often false breakouts.
 */
function applyTimeframeFilter(
  consensus: { action: 'buy' | 'sell' | 'hold'; confidence: number },
  candles4h: { close: number }[]
): { action: 'buy' | 'sell' | 'hold'; confidence: number; reason: string } {
  if (consensus.action === 'hold' || candles4h.length < 10) {
    return { ...consensus, reason: 'No MTF filter needed' };
  }

  const sma10 = candles4h.slice(-10).reduce((a, b) => a + b.close, 0) / 10;
  const currentPrice = candles4h[candles4h.length - 1].close;
  const trend4h = currentPrice > sma10 ? 'bull' : 'bear';

  // If 1h says buy but 4h is bearish → likely false breakout, reduce confidence
  if (consensus.action === 'buy' && trend4h === 'bear') {
    const newConfidence = Math.max(0, consensus.confidence - 20);
    if (newConfidence < 55) {
      return { action: 'hold', confidence: newConfidence, reason: `MTF blocked: 1h BUY but 4h bearish (SMA10=${sma10.toFixed(0)})` };
    }
    return { action: 'buy', confidence: newConfidence, reason: `MTF weakened: 4h bearish (-20 conf)` };
  }

  // If 1h says sell but 4h is bullish → likely pullback, reduce confidence
  if (consensus.action === 'sell' && trend4h === 'bull') {
    const newConfidence = Math.max(0, consensus.confidence - 20);
    if (newConfidence < 45) {
      return { action: 'hold', confidence: newConfidence, reason: `MTF blocked: 1h SELL but 4h bullish (SMA10=${sma10.toFixed(0)})` };
    }
    return { action: 'sell', confidence: newConfidence, reason: `MTF weakened: 4h bullish (-20 conf)` };
  }

  // Aligning timeframes → boost confidence slightly
  return { ...consensus, confidence: Math.min(100, consensus.confidence + 5), reason: `MTF confirmed: 1h+4h ${trend4h}` };
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
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = (await createClient()) as SupabaseClient<Database>;

  // AUTO-RECOVERY: Gjenopprett stalled sessions (paused + crashed)
  try { await db.rpc("heal_stale_sessions" as never); } catch { /* best effort */ }

  const startTime = Date.now();
  const results: { symbol: string; status: string; confidence?: number; error?: string }[] = [];

  try {
    // Fetch 1h + 4h candles for all symbols concurrently
    const priceMap = new Map<string, number[]>();
    const volumeMap = new Map<string, number[]>();
    const candles4hMap = new Map<string, { close: number }[]>();

    await Promise.all(
      TOP_SYMBOLS.map(async (symbol) => {
        try {
          // 1h candles (primary timeframe)
          const candles1h = await fetchCandles(symbol, '1h', 100);
          if (candles1h && candles1h.length >= 50) {
            priceMap.set(symbol, candles1h.map((c) => c.close));
            volumeMap.set(symbol, candles1h.map((c) => c.volume));
          }
          // 4h candles (trend filter)
          const candles4h = await fetchCandles(symbol, '4h', 25);
          if (candles4h && candles4h.length >= 10) {
            candles4hMap.set(symbol, candles4h.map((c) => ({ close: c.close })));
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

        // QUALITY FILTER: Skip illiquid coins (NexusTrade research: quality filters = key)
        if (volumes && volumes.length >= 24) {
          const recentVol = volumes.slice(-24).reduce((a, b) => a + b, 0);
          if (recentVol < 5_000_000) { // < 5M USDT 24h = too illiquid
            console.warn(`[AI-Engine] Skipping ${symbol}: 24h volume ${(recentVol / 1e6).toFixed(1)}M USDT < 5M threshold`);
            results.push({ symbol, status: 'skipped_low_volume' });
            continue;
          }
        }

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
        };
        const { error: featErr } = await db.from('ai_feature_store').insert(featuresPayload);
        if (featErr) {
          console.warn(`[Cron AI-Engine] feature_store insert warning for ${symbol}:`, featErr.message);
        }

        // 2) Run multi-agent ensemble
        let consensus = await runEnsembleForSymbol(db, symbol, prices, volumes, {
          modelVersion: 'ensemble-v2',
          featureVersion: '1h-basic',
        });

        // 2b) Apply multi-timeframe filter (4h trend confirmation)
        const candles4h = candles4hMap.get(symbol);
        if (candles4h) {
          const mtfResult = applyTimeframeFilter(consensus, candles4h);
          if (mtfResult.action !== consensus.action || mtfResult.confidence !== consensus.confidence) {
            console.info(`[AI-Engine MTF] ${symbol}: ${consensus.action}@${consensus.confidence} → ${mtfResult.action}@${mtfResult.confidence} (${mtfResult.reason})`);
          }
          consensus = { ...consensus, action: mtfResult.action, confidence: mtfResult.confidence };
        }

        // 3) Persist to ai_decision_log (legacy observability)
        // NOTE 2026-08-01: skjema-mismatch (symbol/decision_type/sentiment_score
        // eksisterte ikke) gjorde at denne inserten ALLTID feilet → `continue`
        // blokkerte trading_signals-insertene nedenfor → ensemble-signaler nådde
        // aldri tick. Fikset: riktige kolonner + best-effort (aldri blokker kritisk sti).
        const { error: insertError } = await db.from('ai_decision_log').insert({
          user_id: SYSTEM_SIGNAL_USER_ID,
          strategy_id: 'ensemble-v2',
          timestamp: asOf,
          sentiment_value: consensus.confidence,
          sentiment_classification: consensus.action.toUpperCase(),
          sentiment_recommendation: consensus.action,
          sentiment_confidence: consensus.confidence,
          sentiment_reasoning: consensus.reasoning,
          adjustments: {
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
          explanation: consensus.reasoning,
          idempotency_key: `ai-engine-${symbol}-${asOf}`,
          idempotency_scope: 'ai-decision',
        });

        if (insertError) {
          // Observability er best-effort — logg og fortsett (aldri blokkér trading_signals)
          console.error(`[Cron AI-Engine] ai_decision_log insert error for ${symbol}:`, insertError);
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
            });
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
          });
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
