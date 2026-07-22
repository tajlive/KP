import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { captureCronError, captureCronSuccess } from '@/lib/cron/cron-helpers';
import { calculateRSI, calculateMACD, calculateBollingerBands } from '@/lib/trading/indicators';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { validateCronSecret } from "@/lib/auth/cron";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'XRPUSDT',
  'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT', 'DOGEUSDT',
];

import { fetchKlinesViaProxy } from "@/lib/trading/canonical/market-data/binance-proxy-provider";

// OPTIMIZED: Only fetch 55 candles — computeFeatures needs max 50 (SMA50)
// Saves 45% of klines API weight vs 100 candles
// Uses Supabase Edge Function proxy (unngår Cloudflare IP-blokk mot Binance)
async function fetchHourlyCandles(symbol: string, limit = 55) {
  const data = await fetchKlinesViaProxy(symbol, "1h", limit) as [number, string, string, string, string, string][];
  return data.map((c) => ({
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}

function computeFeatures(prices: number[], volumes: number[]) {
  const rsiSeries = prices.length >= 14 ? calculateRSI(prices, 14) : [];
  const rsi = rsiSeries[rsiSeries.length - 1] ?? null;

  const macd = prices.length >= 26 ? calculateMACD(prices) : undefined;
  const macdHist = macd ? macd.histogram[macd.histogram.length - 1] : null;

  const bb = prices.length >= 20 ? calculateBollingerBands(prices, 20, 2) : [];
  const lastBB = bb[bb.length - 1];

  const sma20 = prices.length >= 20 ? prices.slice(-20).reduce((a, b) => a + b, 0) / 20 : null;
  const sma50 = prices.length >= 50 ? prices.slice(-50).reduce((a, b) => a + b, 0) / 50 : null;

  const vol20 = volumes.length >= 20 ? volumes.slice(-20).reduce((a, b) => a + b, 0) / 20 : null;

  let volatility14: number | null = null;
  if (prices.length >= 15) {
    const returns: number[] = [];
    for (let i = prices.length - 14; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    volatility14 = Math.sqrt(variance);
  }

  return {
    close: prices[prices.length - 1] ?? null,
    rsi,
    macd_histogram: macdHist,
    bb_upper: lastBB?.upper ?? null,
    bb_lower: lastBB?.lower ?? null,
    sma20,
    sma50,
    volume_avg_20: vol20,
    volatility_14: volatility14,
    price_count: prices.length,
  };
}

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = (await createClient()) as SupabaseClient<Database>;
  const startTime = Date.now();
  const results: { symbol: string; status: string; error?: string }[] = [];

  try {
    await Promise.all(
      SYMBOLS.map(async (symbol) => {
        try {
          const candles = await fetchHourlyCandles(symbol, 100);
          if (!candles || candles.length < 50) {
            results.push({ symbol, status: 'skipped', error: 'Insufficient data' });
            return;
          }

          const prices = candles.map((c) => c.close);
          const volumes = candles.map((c) => c.volume);
          const features = computeFeatures(prices, volumes);
          const asOf = new Date().toISOString();

          const { error } = await db.from('ai_feature_store').insert({
            symbol,
            timeframe: '1h',
            as_of: asOf,
            features: features as unknown as import('@/types/database.types').Json,
            source: 'binance_spot',
            checksum: `${symbol}-1h-${asOf}`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any);

          if (error) {
            results.push({ symbol, status: 'db_error', error: error.message });
            return;
          }

          results.push({ symbol, status: 'success' });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          results.push({ symbol, status: 'error', error: msg });
        }
      })
    );

    await captureCronSuccess('feature-loader', new Date(startTime), new Date());

    return NextResponse.json({
      success: true,
      durationMs: Date.now() - startTime,
      results,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    captureCronError('feature-loader', err, { durationMs: Date.now() - startTime });
    return NextResponse.json(
      { success: false, error: err.message, durationMs: Date.now() - startTime },
      { status: 500 }
    );
  }
}

// Also support POST for pg_cron triggering
export const POST = GET;
