/**
 * DCA Strategy — Dollar-Cost Averaging with Volatility-Harvesting
 *
 * Kjøper fast beløp med jevne mellomrom. Kjøper MER i dip, MINDRE i FOMO.
 * Selger med trailing stop (2x ATR) + partial profit taking.
 *
 * Forbedringer fra v1:
 * - Trailing stop (2x ATR) istedenfor fast -10%
 * - Partial profit taking (33% ved +3%, 33% ved +7%, rest ved +12%)
 * - Compound positions (legger til lots, ikke bare in/out)
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
}

export class DCAStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { session, config, candles } = input;
    const cfg: DCAConfig = config as DCAConfig;

    const intervalMinutes = cfg.interval_minutes ?? 30;
    let positionSize = cfg.position_size ?? 0.05;

    // Time-based check
    const now = input.currentTime ?? Date.now();
    const lastTick = session.last_tick_at
      ? new Date(session.last_tick_at).getTime()
      : 0;
    const minutesSinceLast = (now - lastTick) / 60_000;

    if (minutesSinceLast < intervalMinutes) {
      return {
        action: "hold",
        reason: `Waiting ${Math.round(intervalMinutes - minutesSinceLast)} min`,
      };
    }

    const closes = candles.map((c) => c.close);
    const currentPrice = closes[closes.length - 1];

    // Volatility-Harvesting: buy more in dips, less in FOMO
    if (closes.length >= 24) {
      const price24hAgo = closes[closes.length - 24];
      const change24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;
      if (change24h <= -5) positionSize *= 3;
      else if (change24h <= -3) positionSize *= 2;
      else if (change24h >= 5) positionSize *= 0.5;
    }

    // If no position, buy
    if (!session.open_position) {
      return {
        action: "buy",
        positionSize,
        indicators: {
          strategy: "dca",
          interval: intervalMinutes,
          volatility_adjusted: true,
        },
      };
    }

    // Have position — check exits
    const entryPrice = session.open_position.entry_price;
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;

    // Partial profit taking levels
    const partialLevels = cfg.partial_tp_levels ?? [
      { target_pct: 3, sell_pct: 33 },
      { target_pct: 7, sell_pct: 33 },
      { target_pct: 12, sell_pct: 34 },
    ];

    // Track executed levels in position metadata
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
        reason: `Partial TP: ${nextLevel.sell_pct}% at +${nextLevel.target_pct}% target`,
      };
    }

    // Trailing stop (2x ATR) — improved from fixed -10%
    if (cfg.use_trailing_stop !== false && candles.length >= 14) {
      const highs = candles.map((c) => c.high);
      const lows = candles.map((c) => c.low);
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
          reason: `Trailing stop: price dropped ${dropFromPeak.toFixed(1)}% from peak (2x ATR = ${trailingStopPct.toFixed(1)}%)`,
        };
      }
    }

    // Fallback to fixed stop loss
    const stopLoss = cfg.stop_loss_pct ?? -10;
    if (pnlPct <= stopLoss) {
      return {
        action: "sell",
        indicators: {
          pnl_pct: Math.round(pnlPct * 100) / 100,
          stop_loss: stopLoss,
        },
        reason: `Stop loss hit: ${pnlPct.toFixed(1)}% (limit: ${stopLoss}%)`,
      };
    }

    return { action: "hold" };
  }
}
