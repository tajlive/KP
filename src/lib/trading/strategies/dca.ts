/**
 * DCA Strategy — Dollar-Cost Averaging with Volatility-Harvesting
 *
 * V2: Dynamisk parametere per config. ATR-basert trailing stop.
 */

import type { Candle, MinimalSession, StrategyEngine, StrategyInput, StrategySignal } from "./types";
import { atr } from "./indicators";

export interface DCAConfig {
  interval_minutes?: number;
  position_size?: number;
  profit_target_pct?: number;
  stop_loss_pct?: number;
  use_trailing_stop?: boolean;
  partial_tp_levels?: Array<{ target_pct: number; sell_pct: number }>;
  dip_multiplier?: number;
  fomo_reduction?: number;
  max_daily_buys?: number;
}

export class DCAStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { session, config, candles } = input;
    const cfg: DCAConfig = config as DCAConfig;

    const intervalMinutes = cfg.interval_minutes ?? 60;
    let positionSize = cfg.position_size ?? 0.04;
    const dipMultiplier = cfg.dip_multiplier ?? 2;
    const fomoReduction = cfg.fomo_reduction ?? 0.5;
    const maxDailyBuys = cfg.max_daily_buys ?? 3;

    const now = input.currentTime ?? Date.now();
    const lastTick = session.last_tick_at
      ? new Date(session.last_tick_at).getTime()
      : 0;
    const minutesSinceLast = (now - lastTick) / 60_000;

    // Check max daily buys
    const today = new Date(now).toISOString().split("T")[0];
    const sessionBuysToday = (session.strategy_config as Record<string, unknown>)?.daily_buys_today as string ?? "";
    const dailyBuyCount = sessionBuysToday === today
      ? ((session.strategy_config as Record<string, unknown>)?.daily_buy_count as number ?? 0)
      : 0;

    if (minutesSinceLast < intervalMinutes) {
      return {
        action: "hold",
        reason: `Waiting ${Math.round(intervalMinutes - minutesSinceLast)} min`,
      };
    }

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const currentPrice = closes[closes.length - 1];

    // Volatility-Harvesting: buy more in dips, less in FOMO
    if (closes.length >= 24) {
      const price24hAgo = closes[closes.length - 24];
      const change24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;
      if (change24h <= -5) positionSize *= dipMultiplier;
      else if (change24h <= -3) positionSize *= Math.max(1.5, dipMultiplier * 0.7);
      else if (change24h >= 5) positionSize *= fomoReduction;
    }

    // If no position, buy (respecting daily limit)
    if (!session.open_position) {
      if (dailyBuyCount >= maxDailyBuys) {
        return {
          action: "hold",
          reason: `Max daily buys (${maxDailyBuys}) reached`,
        };
      }
      return {
        action: "buy",
        positionSize,
        indicators: {
          strategy: "dca",
          interval: intervalMinutes,
          volatility_adjusted: true,
          daily_buy_count: dailyBuyCount + 1,
        },
      };
    }

    // Have position — check exits
    const entryPrice = session.open_position.entry_price;
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;

    // Partial profit taking levels
    const partialLevels = cfg.partial_tp_levels ?? [
      { target_pct: 5, sell_pct: 25 },
      { target_pct: 10, sell_pct: 25 },
      { target_pct: 15, sell_pct: 25 },
      { target_pct: 25, sell_pct: 25 },
    ];

    const executedLevels = (session.open_position as unknown as Record<string, unknown>)
      ?.partial_exits_executed as number[] | undefined;

    const nextLevel = partialLevels.find(
      (l) => pnlPct >= l.target_pct && !(executedLevels?.includes(l.target_pct)),
    );

    if (nextLevel) {
      const currentQty = session.open_position.quantity || 1;
      return {
        action: "sell",
        positionSize: (nextLevel.sell_pct / 100) * currentQty,
        indicators: {
          pnl_pct: Math.round(pnlPct * 100) / 100,
          target: nextLevel.target_pct,
          partial_tp: true,
        },
        reason: `Partial TP: ${nextLevel.sell_pct}% at +${nextLevel.target_pct}%`,
      };
    }

    // Trailing stop (ATR-based)
    if (cfg.use_trailing_stop !== false && candles.length >= 14) {
      const atrValue = atr(highs, lows, closes, 14);
      const trailingStopPct = (2 * atrValue / entryPrice) * 100;
      const highestPrice = session.open_position.highest_price ?? entryPrice;
      const dropFromPeak = ((highestPrice - currentPrice) / highestPrice) * 100;

      if (dropFromPeak >= trailingStopPct) {
        return {
          action: "sell",
          indicators: {
            pnl_pct: Math.round(pnlPct * 100) / 100,
            trailing_stop: true,
            drop_from_peak: Math.round(dropFromPeak * 100) / 100,
            atr_stop_pct: Math.round(trailingStopPct * 100) / 100,
          },
          reason: `Trailing stop: dropped ${dropFromPeak.toFixed(1)}% from peak (2x ATR)`,
        };
      }
    }

    // Fallback fixed stop loss
    const stopLoss = cfg.stop_loss_pct ?? -10;
    if (pnlPct <= stopLoss) {
      return {
        action: "sell",
        indicators: {
          pnl_pct: Math.round(pnlPct * 100) / 100,
          stop_loss: stopLoss,
        },
        reason: `Stop loss: ${pnlPct.toFixed(1)}%`,
      };
    }

    return { action: "hold" };
  }
}
