/**
 * Backtest API - KLA-240
 * POST /api/backtest
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchHistoricalData, runBacktest, generateSignalsFromLog, StrategyType, RiskProfile, STRATEGY_MAP, STRATEGY_METHODOLOGY } from '@/lib/backtest/engine';
import { createServerClient } from "@/lib/supabase/server";
import { runMonteCarlo } from '@/lib/trading/monte-carlo';
import { z } from 'zod';

const BacktestSchema = z.object({
  symbol: z.string().regex(/^[A-Z]{3,10}USDT$/).optional(),
  interval: z.enum(['1d', '4h', '1h']).default('1d'),
  strategy: z.enum(['SMA_CROSSOVER', 'RSI_MEAN_REVERSION', 'AI_SIGNALS', 'ENSEMBLE_AI', 'DCA', 'GRID', 'MULTI_SIGNAL']).default('SMA_CROSSOVER'),
  initialCapital: z.number().min(1000).max(1000000).default(10000),
  period: z.number().min(7).max(1460).default(365), // Days - up to 4 years
  riskProfile: z.enum(['konservativ', 'balansert', 'aggressiv']).optional(),
  smaFast: z.number().min(5).max(50).optional(),
  smaSlow: z.number().min(20).max(200).optional(),
  maxPositionPct: z.number().min(0.1).max(1.0).optional(),
  includeMonteCarlo: z.boolean().optional().default(false),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = BacktestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      );
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
    
    // If risk profile is provided, use its configuration
    if (riskProfile && STRATEGY_MAP[riskProfile]) {
      const config = STRATEGY_MAP[riskProfile];
      finalSymbol = config.symbol;
      finalSmaFast = config.smaFast;
      finalSmaSlow = config.smaSlow;
      finalMaxPositionPct = config.maxPositionPct;
      strategyName = config.name;
    }
    
    // Rate limit check - TODO: add backtest_results table (KLA-240)
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Note: Rate limiting and storage disabled until backtest_results table is created
    // See FASE 4 of KLA-240 for migration
    
    // Fetch historical data based on period
    const candles = await fetchHistoricalData(finalSymbol, interval, period);
    
    if (candles.length < 50) {
      return NextResponse.json(
        { error: 'Insufficient historical data' },
        { status: 400 }
      );
    }
    
    // Build signals
    let externalSignals: ('BUY' | 'SELL' | 'HOLD')[] | undefined;

    if (strategy === 'ENSEMBLE_AI') {
      const fromDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();
      // ai_decision_log columns: timestamp, sentiment_value, sentiment_classification, adjustments
      // NOTE: no 'symbol' or 'executed_at' columns exist — filter by strategy_id instead
      const { data: logSignals, error: logError } = await supabase
        .from('ai_decision_log')
        .select('timestamp, sentiment_classification, sentiment_value, adjustments')
        .gte('timestamp', fromDate)
        .order('timestamp', { ascending: true });

      if (logError) {
        console.error('[Backtest] ai_decision_log query error:', logError);
      }

      // Filter to ensemble signals only if adjustments/explanation has ensemble flag
      const ensembleSignals = (logSignals || []).filter((row) => {
        const adj = row.adjustments as Record<string, unknown> | null | undefined;
        return adj && adj.ensemble === true;
      });

      externalSignals = generateSignalsFromLog(
        candles,
        ensembleSignals.map((s) => ({
          timestamp: s.timestamp ?? new Date().toISOString(),
          decision_type: s.sentiment_classification,
          sentiment_score: s.sentiment_value ?? 0,
        }))
      );
    }

    // Run backtest with strategy parameters
    const result = runBacktest(candles, strategy as StrategyType, initialCapital, {
      smaFast: finalSmaFast,
      smaSlow: finalSmaSlow,
      maxPositionPct: finalMaxPositionPct,
      symbol: finalSymbol,
      riskProfile,
    }, externalSignals);

    // Optional Monte Carlo simulation
    let monteCarlo = undefined;
    if (includeMonteCarlo && result.trades.length >= 3) {
      monteCarlo = runMonteCarlo(
        result.trades as unknown as import('@/lib/trading/backtestEngine').BacktestTrade[],
        { simulations: 10_000, initialCapital, ruinThresholdPct: 0.5 }
      );
    }
    
    // Save to Supabase if authenticated - TODO: re-enable after migration (KLA-240)
    // if (user) {
    //   await supabase.from('backtest_results').insert({...});
    // }
    
    return NextResponse.json({
      ...result,
      monteCarlo,
      strategyName,
      symbol: finalSymbol,
      period,
      candlesAnalyzed: candles.length,
      methodology: STRATEGY_METHODOLOGY[strategy as keyof typeof STRATEGY_METHODOLOGY] || null,
      disclaimer: 'Historisk avkastning er ingen garanti for fremtidig avkastning',
    });
  } catch (error) {
    console.error('Backtest error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
