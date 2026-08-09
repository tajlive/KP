/**
 * MAKS AGGRESSIV — 5x Leveraged Grid SOL
 * 
 * Høyest risiko, høyest avkastning.
 * Kill switch: 3% daglig tap. Auto-reduser: 2 tapsdager → 3x.
 * 
 * @module trading/strategies
 * @version 1.0.0
 */

import type { StrategyInput, StrategySignal, MinimalSession } from "./types";
import { GridBotStrategy } from "./grid";
import { LiquidationGuard } from "../safety/liquidation-guard";

export interface MaxAggressiveConfig {
  symbol: string; // "SOLUSDT"
  leverage: number; // 5
  grid_range_pct: number; // ±1.5%
  grid_levels: number; // 20
  capital: number; // 100%
  kill_switch_loss_pct: number; // 3
  auto_reduce_after_loss_days: number; // 2
  rebalance_interval_hours: number; // 2
}

export class MaxAggressiveGridStrategy extends GridBotStrategy {
  private config: MaxAggressiveConfig;
  private liquidationGuard: LiquidationGuard;
  private currentLeverage: number;

  constructor(config: MaxAggressiveConfig) {
    super();
    this.config = config;
    this.currentLeverage = config.leverage;
    this.liquidationGuard = new LiquidationGuard();
  }

  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session } = input;
    const currentPrice = candles[candles.length - 1].close;

    // 1. Kill switch: 3% daglig tap
    const dailyPnl = this.calculateDailyPnl(session);
    if (dailyPnl <= -this.config.kill_switch_loss_pct) {
      return {
        action: "hold",
        reason: "kill_switch_triggered",
        metadata: { daily_pnl: dailyPnl, limit: this.config.kill_switch_loss_pct },
      };
    }

    // 2. Auto-reduser leverage etter 2 tapsdager
    if (this.shouldReduceLeverage(session)) {
      this.currentLeverage = 3;
      return {
        action: "hold",
        reason: "leverage_reduced_to_3x",
        metadata: { previous_leverage: 5, new_leverage: 3 },
      };
    }

    // 3. Liquidation guard
    const liqStatus = this.liquidationGuard.check(
      session.open_position as { liquidation_price?: number } | null,
      currentPrice,
      this.currentLeverage
    );

    if (liqStatus.status === "critical") {
      return {
        action: "sell",
        reason: "liquidation_guard_critical",
        metadata: { distance: liqStatus.distance, price: currentPrice },
      };
    }

    // 4. Grid med leverage
    const baseSignal = super.evaluate(input);
    
    if (baseSignal.action === "buy" || baseSignal.action === "sell") {
      return {
        ...baseSignal,
        quantity: (baseSignal.quantity || 0) * this.currentLeverage,
        leverage: this.currentLeverage,
        liquidation_price: liqStatus.liquidation_price,
        margin_ratio: 1 / this.currentLeverage,
      };
    }

    return baseSignal;
  }

  private calculateDailyPnl(session: MinimalSession): number {
    const sessionData = session as unknown as {
      trades?: Array<{ timestamp?: string; pnl?: number }>;
      open_position?: { unrealized_pnl?: number };
      current_capital_nok?: number;
    };
    
    const today = new Date().toISOString().split("T")[0];
    const todayTrades = (sessionData.trades || []).filter(
      (t) => t.timestamp?.startsWith(today)
    );
    
    const realizedPnl = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const unrealizedPnl = sessionData.open_position?.unrealized_pnl || 0;
    const totalPnl = realizedPnl + unrealizedPnl;
    const capital = sessionData.current_capital_nok || 1;
    
    return (totalPnl / capital) * 100;
  }

  private shouldReduceLeverage(session: MinimalSession): boolean {
    // Sjekk om 2 siste dager var tapsdager
    const sessionData = session as unknown as {
      trades?: Array<{ timestamp?: string; pnl?: number }>;
    };
    
    const trades = sessionData.trades || [];
    const today = new Date();
    
    // Grupper per dag
    const dailyPnls = new Map<string, number>();
    for (const trade of trades) {
      const date = trade.timestamp?.split("T")[0];
      if (date) {
        dailyPnls.set(date, (dailyPnls.get(date) || 0) + (trade.pnl || 0));
      }
    }
    
    // Sjekk 2 siste dager
    const dates = Array.from(dailyPnls.keys()).sort().reverse();
    if (dates.length < 2) return false;
    
    const yesterday = dailyPnls.get(dates[0]) || 0;
    const dayBefore = dailyPnls.get(dates[1]) || 0;
    
    return yesterday < 0 && dayBefore < 0;
  }
}
