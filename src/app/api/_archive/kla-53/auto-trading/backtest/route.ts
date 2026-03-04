

/**
 * Auto-Trading Backtest API
 * Uses lib/auto-trading/backtest-engine for actual backtesting logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AutoTradingStrategy } from '@/lib/auto-trading/types';
import { runBacktest } from '@/lib/auto-trading/backtest-engine';
import type { BacktestParams, BacktestResult } from '@/lib/auto-trading/backtest-engine';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { 
      strategyId, 
      startDate, 
      endDate, 
      initialCapital = 100000,
      symbols = ['BTCUSDT', 'ETHUSDT'],
      runAnalysis = false 
    } = body;

    if (!strategyId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: strategyId, startDate, endDate' },
        { status: 400 }
      );
    }

    // Fetch strategy from database using lib function pattern
    const { data: strategy, error: strategyError } = await supabase
      .from('auto_trading_strategies')
      .select('*')
      .eq('id', strategyId)
      .single();

    if (strategyError || !strategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }

    // Build backtest parameters
    const backtestParams: BacktestParams = {
      strategy: strategy as AutoTradingStrategy,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      initialCapital,
      symbols,
    };

    // Run backtest using the engine
    const result: BacktestResult = await runBacktest(backtestParams);

    // Store backtest result in database
    const { error: insertError } = await supabase
      .from('auto_trading_backtests')
      .insert({
        user_id: user.id,
        strategy_id: strategyId,
        start_date: startDate,
        end_date: endDate,
        initial_capital: initialCapital,
        symbols,
        result: result as unknown as Record<string, unknown>,
        is_valid: result.isValid,
        confidence_score: result.confidenceScore,
        recommendation: result.recommendation,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error storing backtest:', insertError);
      // Non-critical, continue
    }

    // Run additional analysis if requested
    let analysis = null;
    if (runAnalysis) {
      // Analysis features to be implemented in future iteration
      analysis = {
        walkForward: null,
        monteCarlo: null,
        stressTest: null,
      };
    }

    return NextResponse.json({
      success: true,
      result,
      analysis,
    });

  } catch (error) {
    console.error('Backtest API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Fetch user's backtest history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const strategyId = searchParams.get('strategyId');

    let query = supabase
      .from('auto_trading_backtests')
      .select(`
        *,
        strategy:auto_trading_strategies(name, risk_level)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (strategyId) {
      query = query.eq('strategy_id', strategyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching backtests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch backtests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      backtests: data || [],
    });

  } catch (error) {
    console.error('Backtest history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
