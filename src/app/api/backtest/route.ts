/**
 * Backtest API - KLA-240
 * POST /api/backtest
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchHistoricalData, runBacktest, generateSignalsFromLog, StrategyType, RiskProfile, STRATEGY_MAP } from '@/lib/backtest/engine';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const BacktestSchema = z.object({
  symbol: z.string().regex(/^[A-Z]{3,10}USDT$/).optional(),
  interval: z.enum(['1d', '4h', '1h']).default('1d'),
  strategy: z.enum(['SMA_CROSSOVER', 'RSI_MEAN_REVERSION', 'AI_SIGNALS', 'ENSEMBLE_AI']).default('SMA_CROSSOVER'),
  initialCapital: z.number().min(1000).max(1000000).default(10000),
  period: z.number().min(7).max(1095).default(365), // Days - up to 3 years
  riskProfile: z.enum(['konservativ', 'balansert', 'aggressiv']).optional(),
  smaFast: z.number().min(5).max(50).optional(),
  smaSlow: z.number().min(20).max(200).optional(),
  maxPositionPct: z.number().min(0.1).max(1.0).optional(),
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
    const supabase = await createClient();
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
      const { data: logSignals, error: logError } = await supabase
        .from('ai_decision_log')
        .select('executed_at, decision_type, sentiment_score, analysis_data')
        .eq('symbol', finalSymbol)
        .gte('executed_at', fromDate)
        .order('executed_at', { ascending: true });

      if (logError) {
        console.error('[Backtest] ai_decision_log query error:', logError);
      }

      // Filter to ensemble signals only if analysis_data has ensemble flag
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

    // Run backtest with strategy parameters
    const result = runBacktest(candles, strategy as StrategyType, initialCapital, {
      smaFast: finalSmaFast,
      smaSlow: finalSmaSlow,
      maxPositionPct: finalMaxPositionPct,
    }, externalSignals);
    
    // Save to Supabase if authenticated - TODO: re-enable after migration (KLA-240)
    // if (user) {
    //   await supabase.from('backtest_results').insert({...});
    // }
    
    return NextResponse.json({
      ...result,
      strategyName,
      symbol: finalSymbol,
      period,
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
