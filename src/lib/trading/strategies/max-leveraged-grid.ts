/**
 * MAX LEVERAGED GRID — 5x ETH Strategy
 * 
 * Høyest risiko, høyest potensiell avkastning.
 * Bruker samme grid-engine som spot, men med 5x leverage.
 * 
 * KRITISK: Liquidation ved 20% prisfall. Kill switch ved 10% daglig tap.
 * 
 * @module trading/strategies
 * @version 1.0.0
 */

import type { StrategyInput, StrategySignal, MinimalSession } from "./types";
import { GridBotStrategy } from "./grid";
import { LiquidationGuard } from "../safety/liquidation-guard";

export interface MaxLeveragedGridConfig {
  symbol: string;
  leverage: number; // 5x
  grid_range_pct: number; // ±3%
  grid_levels: number; // 15
  capital: number; // 100% av tilgjengelig
  kill_switch_loss_pct: number; // 10% daglig tap = stopp
}

export class MaxLeveragedGridStrategy extends GridBotStrategy {
  private leverage: number;
  private liquidationGuard: LiquidationGuard;
  private killSwitchLossPct: number;

  constructor(config: MaxLeveragedGridConfig) {
    super();
    this.leverage = config.leverage;
    this.killSwitchLossPct = config.kill_switch_loss_pct;
    this.liquidationGuard = new LiquidationGuard();
  }

  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session } = input;
    const currentPrice = candles[candles.length - 1].close;

    // 1. Sjekk kill switch (10% daglig tap)
    const dailyPnl = this.calculateDailyPnl(session);
    if (dailyPnl <= -this.killSwitchLossPct) {
      return {
        action: "hold",
        reason: "kill_switch_triggered",
        metadata: { daily_pnl: dailyPnl, limit: this.killSwitchLossPct },
      };
    }

    // 2. Sjekk liquidation-avstand
    const liqStatus = this.liquidationGuard.check(
      session.open_position as { liquidation_price?: number } | null,
      currentPrice,
      this.leverage
    );

    if (liqStatus.status === "critical") {
      return {
        action: "sell",
        reason: "liquidation_guard_critical",
        metadata: { distance: liqStatus.distance, price: currentPrice },
      };
    }

    // 3. Kjør vanlig grid med leverage
    const baseSignal = super.evaluate(input);
    
    if (baseSignal.action === "buy" || baseSignal.action === "sell") {
      return {
        ...baseSignal,
        quantity: (baseSignal.quantity || 0) * this.leverage,
        leverage: this.leverage,
        liquidation_price: liqStatus.liquidation_price,
        margin_ratio: 1 / this.leverage,
      };
    }

    return baseSignal;
  }

  private calculateDailyPnl(session: MinimalSession): number {
    // Beregn daglig P&L i prosent — trades og open_position er dynamiske felter
    const sessionData = session as unknown as {
      trades?: Array<{ timestamp?: string; pnl?: number }>;
      open_position?: { unrealized_pnl?: number };
      current_capital_nok?: number;
    };
    
    const today = new Date().toISOString().split("T")[0];
    const todayTrades = (sessionData.trades || []).filter(
      (t) => t.timestamp?.startsWith(today)
    );
    
    const realizedPnl = todayTrades.reduce(
      (sum, t) => sum + (t.pnl || 0),
      0
    );
    
    const unrealizedPnl = sessionData.open_position?.unrealized_pnl || 0;
    const totalPnl = realizedPnl + unrealizedPnl;
    const capital = sessionData.current_capital_nok || 1;
    
    return (totalPnl / capital) * 100;
  }
}
