import { NextRequest, NextResponse } from 'next/server';
import { runBacktest } from '@/lib/auto-trading/backtest-engine';
import type { AutoTradingStrategy, StrategyType, RiskLevel } from '@/lib/auto-trading/types';

export const dynamic = 'force-dynamic';

// Strategy defaults by type + risk level
const STRATEGY_CONFIGS: Record<StrategyType, Record<string, Partial<AutoTradingStrategy>>> = {
  dca: {
    conservative: { timeframe: '4h', stop_loss_pct: 0.03, take_profit_pct: 0.08, max_position_size_pct: 0.02, max_trades_per_day: 2 },
    balanced:     { timeframe: '4h', stop_loss_pct: 0.05, take_profit_pct: 0.10, max_position_size_pct: 0.03, max_trades_per_day: 3 },
    aggressive:   { timeframe: '1h', stop_loss_pct: 0.07, take_profit_pct: 0.15, max_position_size_pct: 0.05, max_trades_per_day: 5 },
  },
  grid: {
    conservative: { timeframe: '1h', stop_loss_pct: 0.02, take_profit_pct: 0.04, max_position_size_pct: 0.03, max_trades_per_day: 5 },
    balanced:     { timeframe: '1h', stop_loss_pct: 0.03, take_profit_pct: 0.06, max_position_size_pct: 0.05, max_trades_per_day: 10 },
    aggressive:   { timeframe: '1h', stop_loss_pct: 0.05, take_profit_pct: 0.10, max_position_size_pct: 0.08, max_trades_per_day: 15 },
  },
  trend: {
    conservative: { timeframe: '1h', stop_loss_pct: 0.02, take_profit_pct: 0.05, max_position_size_pct: 0.03, max_trades_per_day: 3 },
    balanced:     { timeframe: '1h', stop_loss_pct: 0.03, take_profit_pct: 0.08, max_position_size_pct: 0.05, max_trades_per_day: 5 },
    aggressive:   { timeframe: '1h', stop_loss_pct: 0.05, take_profit_pct: 0.12, max_position_size_pct: 0.08, max_trades_per_day: 8 },
  },
  momentum: {
    conservative: { timeframe: '1h', stop_loss_pct: 0.02, take_profit_pct: 0.06, max_position_size_pct: 0.03, max_trades_per_day: 3 },
    balanced:     { timeframe: '1h', stop_loss_pct: 0.04, take_profit_pct: 0.10, max_position_size_pct: 0.05, max_trades_per_day: 5 },
    aggressive:   { timeframe: '1h', stop_loss_pct: 0.06, take_profit_pct: 0.15, max_position_size_pct: 0.08, max_trades_per_day: 8 },
  },
};

function buildStrategy(strategyType: StrategyType, riskLevel: RiskLevel): AutoTradingStrategy {
  const normalizedRisk = (riskLevel === 'custom' || riskLevel === 'dynamic') ? 'balanced' : riskLevel;
  const config = STRATEGY_CONFIGS[strategyType]?.[normalizedRisk] || STRATEGY_CONFIGS.trend.balanced;

  return {
    id: 'quick-backtest',
    name: `${strategyType}-${normalizedRisk}`,
    risk_level: riskLevel,
    description: 'Quick backtest strategy',
    timeframe: config.timeframe || '1h',
    max_position_size_pct: config.max_position_size_pct || 0.05,
    stop_loss_pct: config.stop_loss_pct || 0.03,
    take_profit_pct: config.take_profit_pct || 0.08,
    daily_loss_limit_pct: normalizedRisk === 'conservative' ? 2 : normalizedRisk === 'balanced' ? 5 : 8,
    max_trades_per_day: config.max_trades_per_day || 5,
    allow_long: true,
    allow_short: false,
    max_leverage: 1,
    allowed_symbols: ['BTCUSDT'],
    is_active: true,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { strategy: strategyType, riskLevel, symbol } = body as {
      strategy: StrategyType;
      riskLevel: RiskLevel;
      symbol?: string;
    };

    if (!strategyType || !riskLevel) {
      return NextResponse.json(
        { error: 'Missing required: strategy, riskLevel' },
        { status: 400 }
      );
    }

    const strategy = buildStrategy(strategyType, riskLevel);
    const sym = symbol || 'BTCUSDT';

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const result = await runBacktest({
      strategy,
      startDate,
      endDate,
      initialCapital: 100000,
      symbols: [sym],
    });

    return NextResponse.json({
      success: true,
      totalReturn: result.totalReturn,
      winRate: result.winRate,
      maxDrawdown: result.maxDrawdown,
      sharpeRatio: result.sharpeRatio,
      totalTrades: result.totalTrades,
      recommendation: result.recommendation,
      confidenceScore: result.confidenceScore,
      profitFactor: result.profitFactor,
      vsBuyAndHold: result.vsBuyAndHold,
      candlesUsed: result.candlesUsed,
    });
  } catch (error) {
    console.error('Quick backtest error:', error);
    return NextResponse.json(
      { error: 'Backtest failed' },
      { status: 500 }
    );
  }
}
