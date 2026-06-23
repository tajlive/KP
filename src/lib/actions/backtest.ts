'use server';

import { fetchHistoricalData, runBacktest, generateSignalsFromLog, StrategyType, STRATEGY_MAP, STRATEGY_METHODOLOGY } from '@/lib/backtest/engine';
import { createServerClient } from "@/lib/supabase/server";
import { runMonteCarlo } from '@/lib/trading/monte-carlo';
import { z } from 'zod';

const BacktestSchema = z.object({
  symbol: z.string().regex(/^[A-Z]{3,10}USDT$/).optional(),
  interval: z.enum(['1d', '4h', '1h']).default('1d'),
  strategy: z.enum(['SMA_CROSSOVER', 'RSI_MEAN_REVERSION', 'AI_SIGNALS', 'ENSEMBLE_AI', 'DCA', 'GRID', 'MULTI_SIGNAL']).default('SMA_CROSSOVER'),
  initialCapital: z.number().min(1000).max(1000000).default(10000),
  period: z.number().min(7).max(1460).default(365),
  riskProfile: z.enum(['konservativ', 'balansert', 'aggressiv']).optional(),
  smaFast: z.number().min(5).max(50).optional(),
  smaSlow: z.number().min(20).max(200).optional(),
  maxPositionPct: z.number().min(0.1).max(1.0).optional(),
  includeMonteCarlo: z.boolean().optional(),
});

export type BacktestInput = z.infer<typeof BacktestSchema>;

export async function executeBacktest(input: BacktestInput) {
  const validation = BacktestSchema.safeParse(input);

  if (!validation.success) {
    throw new Error(`Invalid input: ${validation.error.message}`);
  }

  const {
    symbol,
    interval,
    strategy,
    initialCapital,
    period,
    riskProfile,
    smaFast,
    smaSlow,
    maxPositionPct,
    includeMonteCarlo,
  } = validation.data;

  // Determine strategy parameters
  let finalSymbol = symbol || 'BTCUSDT';
  let finalSmaFast = smaFast || 20;
  let finalSmaSlow = smaSlow || 50;
  let finalMaxPositionPct = maxPositionPct || 1.0;
  let strategyName = 'BTC SMA 20/50';

  if (riskProfile && STRATEGY_MAP[riskProfile]) {
    const config = STRATEGY_MAP[riskProfile];
    finalSymbol = config.symbol;
    finalSmaFast = config.smaFast;
    finalSmaSlow = config.smaSlow;
    finalMaxPositionPct = config.maxPositionPct;
    strategyName = config.name;
  }

  const supabase = await createServerClient();

  // Fetch historical data
  const candles = await fetchHistoricalData(finalSymbol, interval, period);

  if (candles.length < 50) {
    throw new Error('Insufficient historical data');
  }

  // Build signals
  let externalSignals: ('BUY' | 'SELL' | 'HOLD')[] | undefined;

  if (strategy === 'ENSEMBLE_AI') {
    const fromDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();
    const { data: logSignals, error: logError } = await supabase
      .from('ai_decision_log')
      .select('executed_at, decision_type, sentiment_score, analysis_data')
      .eq('symbol', finalSymbol)
      .gte('executed_at', fromDate)
      .order('executed_at', { ascending: true });

    if (logError) {
      console.error('[Backtest] ai_decision_log query error:', logError);
    }

    const ensembleSignals = (logSignals || []).filter((row) => {
      const data = row.analysis_data as Record<string, unknown> | null | undefined;
      return data && data.ensemble === true;
    });

    externalSignals = generateSignalsFromLog(
      candles,
      ensembleSignals.map((s) => ({
        timestamp: s.executed_at ?? new Date().toISOString(),
        decision_type: s.decision_type,
        sentiment_score: s.sentiment_score ?? 0,
      }))
    );
  }

  // Run backtest
  const result = runBacktest(candles, strategy as StrategyType, initialCapital, {
    smaFast: finalSmaFast,
    smaSlow: finalSmaSlow,
    maxPositionPct: finalMaxPositionPct,
    symbol: finalSymbol,
    riskProfile,
  }, externalSignals);

  // Optional Monte Carlo
  let monteCarlo = undefined;
  if (includeMonteCarlo && result.trades.length >= 3) {
    monteCarlo = runMonteCarlo(
      result.trades as unknown as import('@/lib/trading/backtestEngine').BacktestTrade[],
      { simulations: 10_000, initialCapital, ruinThresholdPct: 0.5 }
    );
  }

  return {
    ...result,
    monteCarlo,
    strategyName,
    symbol: finalSymbol,
    period,
    methodology: STRATEGY_METHODOLOGY[strategy as keyof typeof STRATEGY_METHODOLOGY] || null,
    disclaimer: 'Historisk avkastning er ingen garanti for fremtidig avkastning',
  };
}
