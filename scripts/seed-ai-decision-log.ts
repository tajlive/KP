/**
 * Seed ai_decision_log by running ensemble engine directly.
 */
import { createClient } from '@supabase/supabase-js';
import { generateEnsembleSignalsBatch } from '../src/lib/ai/ensemble-engine';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TOP_SYMBOLS = ['BTCUSDT', 'ETHUSDT'];

async function fetchHourlyCandles(symbol: string, limit = 100) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Binance API error: ${res.status} for ${symbol}`);
  const data = await res.json() as [number, string, string, string, string, string][];
  return data.map((c) => ({
    close: parseFloat(c[4]),
  }));
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase env vars');
    process.exit(1);
  }

  const db = createClient(SUPABASE_URL, SUPABASE_KEY);
  const priceMap = new Map<string, number[]>();

  await Promise.all(
    TOP_SYMBOLS.map(async (symbol) => {
      try {
        const candles = await fetchHourlyCandles(symbol, 100);
        if (candles.length >= 50) {
          priceMap.set(symbol, candles.map((c) => c.close));
        }
      } catch (err) {
        console.warn(`Failed to fetch prices for ${symbol}:`, err);
      }
    })
  );

  console.log(`Fetched prices for ${priceMap.size} symbols`);

  const batchResults = await generateEnsembleSignalsBatch(
    Array.from(priceMap.keys()),
    (sym) => priceMap.get(sym) ?? [],
    { riskProfile: 'balanced', useLLM: true }
  );

  let inserted = 0;
  for (const item of batchResults) {
    if (!item.signal) {
      console.log(`Skipped ${item.symbol}: ${item.error}`);
      continue;
    }
    const signal = item.signal;
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
      },
      decision_reason: signal.reasoning,
      user_id: '6408d389-2021-4a2f-92b6-bebf0459a398',
      executed_at: new Date().toISOString(),
    });
    if (insertError) {
      console.error(`Insert error for ${signal.symbol}:`, insertError);
    } else {
      inserted++;
      console.log(`Inserted ${signal.symbol}: ${signal.action} @ ${signal.confidence}`);
    }
  }

  console.log(`Done. Inserted ${inserted} signals.`);
}

main().catch(console.error);
