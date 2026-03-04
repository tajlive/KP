/**
 * Risk Management System - UNIFIED VERSION
 * Uses trading_sessions and trades tables only
 */

import { createClient } from '@/lib/supabase/server';

export interface RiskConfig {
  maxPositionSizePercent: number;
  stopLossPercent: number;
  trailingStopLossPercent?: number;
  maxDailyLossPercent: number;
  maxDailyTrades: number;
  maxDrawdownPercent: number;
  maxLeverage: number;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  suggestedAmount?: number;
  currentExposure?: number;
}

export class RiskManager {
  private config: RiskConfig;

  constructor(config: RiskConfig) {
    this.config = config;
  }

  async canExecuteTrade(params: {
    userId: string;
    sessionId: string;
    tradeAmount: number;
    currentCapital: number;
    direction: 'LONG' | 'SHORT';
    symbol?: string;
  }): Promise<RiskCheckResult> {
    const { sessionId, tradeAmount, currentCapital, symbol } = params;

    // 1. Check position size limit
    const positionSizePercent = (tradeAmount / currentCapital) * 100;
    if (positionSizePercent > this.config.maxPositionSizePercent) {
      const suggestedAmount = (currentCapital * this.config.maxPositionSizePercent) / 100;
      return {
        allowed: false,
        reason: `Posisjonsstørrelse (${positionSizePercent.toFixed(2)}%) overstiger maksimum (${this.config.maxPositionSizePercent}%)`,
        suggestedAmount,
        currentExposure: await this.getCurrentExposure(sessionId),
      };
    }

    // 2. Check daily loss limit
    const todayPnL = await this.getTodayPnL(sessionId);
    const todayLossPercent = (Math.abs(Math.min(todayPnL, 0)) / currentCapital) * 100;
    if (todayLossPercent >= this.config.maxDailyLossPercent) {
      return {
        allowed: false,
        reason: `Daglig tapsgrense nådd (${todayLossPercent.toFixed(2)}% / ${this.config.maxDailyLossPercent}%). Trading er deaktivert for i dag.`,
        currentExposure: await this.getCurrentExposure(sessionId),
      };
    }

    // 3. Check daily trade count
    const todayTradeCount = await this.getTodayTradeCount(sessionId);
    if (todayTradeCount >= this.config.maxDailyTrades) {
      return {
        allowed: false,
        reason: `Daglig handelsgrense nådd (${todayTradeCount} / ${this.config.maxDailyTrades})`,
        currentExposure: await this.getCurrentExposure(sessionId),
      };
    }

    // 4. Check max drawdown
    const drawdown = await this.getCurrentDrawdown(sessionId);
    if (drawdown >= this.config.maxDrawdownPercent) {
      return {
        allowed: false,
        reason: `Maks drawdown overskredet (${drawdown.toFixed(2)}% / ${this.config.maxDrawdownPercent}%). Trading stoppet for å beskytte kapital.`,
        currentExposure: await this.getCurrentExposure(sessionId),
      };
    }

    // 5. Check symbol exposure
    if (symbol) {
      const symbolExposure = await this.getSymbolExposure(sessionId, symbol);
      const maxSymbolExposure = this.config.maxPositionSizePercent * 2;
      if (symbolExposure + positionSizePercent > maxSymbolExposure) {
        return {
          allowed: false,
          reason: `For høy eksponering mot ${symbol} (${symbolExposure.toFixed(2)}% + ${positionSizePercent.toFixed(2)}%). Diversifiser risiko.`,
          currentExposure: symbolExposure,
        };
      }
    }

    return { allowed: true, currentExposure: await this.getCurrentExposure(sessionId) };
  }

  calculateStopLoss(params: { entryPrice: number; direction: 'LONG' | 'SHORT'; useTrailing?: boolean; atr?: number }): number {
    const { entryPrice, direction } = params;
    if (direction === 'LONG') {
      return entryPrice * (1 - this.config.stopLossPercent / 100);
    } else {
      return entryPrice * (1 + this.config.stopLossPercent / 100);
    }
  }

  calculateTakeProfit(params: { entryPrice: number; stopLossPrice: number; direction: 'LONG' | 'SHORT'; riskRewardRatio?: number }): number {
    const { entryPrice, stopLossPrice, direction, riskRewardRatio = 2 } = params;
    const risk = Math.abs(entryPrice - stopLossPrice);
    const reward = risk * riskRewardRatio;
    return direction === 'LONG' ? entryPrice + reward : entryPrice - reward;
  }

  // Private helpers - all using unified trades table
  private async getTodayPnL(sessionId: string): Promise<number> {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('trades')
      .select('realized_pnl')
      .eq('session_id', sessionId)
      .gte('executed_at', today)
      .not('realized_pnl', 'is', null);

    return data?.reduce((sum, t) => sum + (t.realized_pnl || 0), 0) || 0;
  }

  private async getTodayTradeCount(sessionId: string): Promise<number> {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];
    
    const { count } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .gte('executed_at', today);

    return count || 0;
  }

  private async getCurrentDrawdown(sessionId: string): Promise<number> {
    const supabase = await createClient();
    
    const { data: trades } = await supabase
      .from('trades')
      .select('realized_pnl, executed_at')
      .eq('session_id', sessionId)
      .order('executed_at', { ascending: true });

    if (!trades || trades.length === 0) return 0;

    const { data: session } = await supabase
      .from('trading_sessions')
      .select('initial_capital')
      .eq('id', sessionId)
      .single();

    const startingCapital = session?.initial_capital || 10000;
    let runningEquity = startingCapital;
    let peak = startingCapital;
    let maxDrawdown = 0;

    for (const trade of trades) {
      runningEquity += trade.realized_pnl || 0;
      peak = Math.max(peak, runningEquity);
      const drawdown = ((peak - runningEquity) / peak) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private async getCurrentExposure(sessionId: string): Promise<number> {
    const supabase = await createClient();
    
    const { data: session } = await supabase
      .from('trading_sessions')
      .select('open_position')
      .eq('id', sessionId)
      .single();

    if (!session?.open_position) return 0;
    
    // Calculate exposure from open position
    const position = session.open_position as { quantity: number; entry_price: number };
    return (position.quantity || 0) * (position.entry_price || 0);
  }

  private async getSymbolExposure(sessionId: string, symbol: string): Promise<number> {
    const supabase = await createClient();
    
    const { data: session } = await supabase
      .from('trading_sessions')
      .select('open_position, trading_pair')
      .eq('id', sessionId)
      .single();

    // If there's an open position in the same symbol
    if (session?.open_position && session.trading_pair === symbol) {
      const position = session.open_position as { quantity: number; entry_price: number };
      const exposure = (position.quantity || 0) * (position.entry_price || 0);
      const { data: sessionData } = await supabase
        .from('trading_sessions')
        .select('current_capital')
        .eq('id', sessionId)
        .single();
      
      if (sessionData?.current_capital) {
        return (exposure / sessionData.current_capital) * 100;
      }
    }

    return 0;
  }
}

export const DEFAULT_RISK_CONFIGS: Record<string, RiskConfig> = {
  conservative: { maxPositionSizePercent: 2, stopLossPercent: 1, trailingStopLossPercent: 0.8, maxDailyLossPercent: 5, maxDailyTrades: 5, maxDrawdownPercent: 10, maxLeverage: 1 },
  balanced: { maxPositionSizePercent: 5, stopLossPercent: 2, trailingStopLossPercent: 1.5, maxDailyLossPercent: 10, maxDailyTrades: 10, maxDrawdownPercent: 15, maxLeverage: 1 },
  aggressive: { maxPositionSizePercent: 10, stopLossPercent: 3, trailingStopLossPercent: 2, maxDailyLossPercent: 20, maxDailyTrades: 20, maxDrawdownPercent: 25, maxLeverage: 2 },
};

export function createRiskManager(riskLevel: string): RiskManager {
  const config = DEFAULT_RISK_CONFIGS[riskLevel] || DEFAULT_RISK_CONFIGS.balanced;
  return new RiskManager(config);
}
