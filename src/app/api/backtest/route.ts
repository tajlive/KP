/**
 * Backtest API - KLA-240
 * POST /api/backtest
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchHistoricalData, runBacktest, StrategyType } from '@/lib/backtest/engine';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const BacktestSchema = z.object({
  symbol: z.string().regex(/^[A-Z]{3,10}USDT$/),
  interval: z.enum(['1d', '4h', '1h']).default('1d'),
  strategy: z.enum(['SMA_CROSSOVER', 'RSI_MEAN_REVERSION', 'AI_SIGNALS']),
  initialCapital: z.number().min(1000).max(1000000),
  period: z.number().min(7).max(730).default(365), // Days
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
    
    const { symbol, interval, strategy, initialCapital, period } = validation.data;
    
    // Rate limit check - TODO: add backtest_results table (KLA-240)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Note: Rate limiting and storage disabled until backtest_results table is created
    // See FASE 4 of KLA-240 for migration
    
    // Fetch historical data based on period
    const candles = await fetchHistoricalData(symbol, interval, period);
    
    if (candles.length < 50) {
      return NextResponse.json(
        { error: 'Insufficient historical data' },
        { status: 400 }
      );
    }
    
    // Run backtest
    const result = runBacktest(candles, strategy as StrategyType, initialCapital);
    
    // Save to Supabase if authenticated - TODO: re-enable after migration (KLA-240)
    // if (user) {
    //   await supabase.from('backtest_results').insert({...});
    // }
    
    return NextResponse.json({
      ...result,
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
