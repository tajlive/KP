/**
 * AI Copy Strategy — Bollinger Breakout + Momentum
 *
 * Kjøper på breakout over øvre Bollinger-bånd.
 * Selger på breakdown under nedre bånd, eller etter hold_time_max_hours.
 * Mean-reversion med momentum-confirmasjon.
 */

import type { MinimalSession, StrategyEngine, StrategyInput, StrategySignal } from "./types";
import { bollingerBands, sma, atr } from "./indicators";

export interface AICopyConfig {
  use_bollinger_breakout?: boolean;
  bb_period?: number;
  bb_std?: number;
  momentum_period?: number;
  min_momentum_pct?: number;
  position_size?: number;
  hold_time_max_hours?: number;
  use_atr_stop?: boolean;
  atr_stop_mult?: number;
}

export class AICopyStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session, config } = input;
    const cfg: AICopyConfig = config as AICopyConfig;

    const bbPeriod = cfg.bb_period ?? 20;
    const bbStd = cfg.bb_std ?? 2;
    const momentumPeriod = cfg.momentum_period ?? 10;
    const minMomentumPct = cfg.min_momentum_pct ?? 1.5;
    const positionSize = cfg.position_size ?? 0.08;
    const holdTimeMaxHours = cfg.hold_time_max_hours ?? 48;
    const useAtrStop = cfg.use_atr_stop ?? false;
    const atrStopMult = cfg.atr_stop_mult ?? 2;

    if (candles.length < bbPeriod + momentumPeriod) {
      return { action: "hold", reason: "Insufficient data" };
    }

    const closes = candles.map((c) => c.close);
    const currentPrice = closes[closes.length - 1];

    const bb = bollingerBands(closes, bbPeriod, bbStd);
    const bbWidth = ((bb.upper - bb.lower) / bb.middle) * 100;

    // Momentum: price change over momentumPeriod
    const momentumPrice = closes[closes.length - 1 - momentumPeriod];
    const momentumPct = ((currentPrice - momentumPrice) / momentumPrice) * 100;

    // Time-based exit check
    if (session.open_position) {
      const entryTime = new Date(session.open_position.entry_time).getTime();
      const hoursInPosition = (Date.now() - entryTime) / (60 * 60 * 1000);
      const entryPrice = session.open_position.entry_price;
      const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;

      // Exit if held too long without profit
      if (hoursInPosition >= holdTimeMaxHours && pnlPct < 0) {
        return {
          action: "sell",
          positionSize,
          indicators: {
            time_exit: true,
            hours_held: Math.round(hoursInPosition * 10) / 10,
            pnl_pct: Math.round(pnlPct * 100) / 100,
          },
          reason: `Time exit: held ${hoursInPosition.toFixed(1)}h without profit`,
        };
      }

      // Exit on breakdown below middle band if profitable
      if (pnlPct > 0 && currentPrice < bb.middle) {
        return {
          action: "sell",
          positionSize,
          indicators: {
            bb_middle_cross: true,
            pnl_pct: Math.round(pnlPct * 100) / 100,
          },
          reason: `Price broke below Bollinger middle band — taking ${pnlPct.toFixed(1)}% profit`,
        };
      }

      // Exit on breakdown below lower band (stop loss)
      if (currentPrice < bb.lower * 1.005) {
        return {
          action: "sell",
          positionSize,
          indicators: {
            bb_breakdown: true,
            pnl_pct: Math.round(pnlPct * 100) / 100,
          },
          reason: `Breakdown below lower Bollinger band — cutting loss`,
        };
      }

      // ATR-based stop loss (tighter than Bollinger for volatile moves)
      if (useAtrStop && candles.length >= 14) {
        const highs = candles.map((c) => c.high);
        const lows = candles.map((c) => c.low);
        const atrValue = atr(highs, lows, closes, 14);
        const atrStopPrice = entryPrice * (1 - (atrStopMult * atrValue) / entryPrice / 100);
        if (currentPrice < atrStopPrice && pnlPct < 0) {
          return {
            action: "sell",
            positionSize,
            indicators: {
              atr_stop: true,
              atr_stop_price: Math.round(atrStopPrice * 100) / 100,
              pnl_pct: Math.round(pnlPct * 100) / 100,
            },
            reason: `ATR stop loss: price ${currentPrice.toFixed(0)} < ${atrStopPrice.toFixed(0)} (${atrStopMult}x ATR)`,
          };
        }
      }
    }

    // Buy: breakout above upper band with momentum
    if (!session.open_position) {
      const isBreakout = currentPrice > bb.upper;
      const hasMomentum = Math.abs(momentumPct) >= minMomentumPct;

      if (isBreakout && hasMomentum) {
        return {
          action: "buy",
          positionSize,
          indicators: {
            bb_breakout: true,
            bb_width: Math.round(bbWidth * 100) / 100,
            momentum_pct: Math.round(momentumPct * 100) / 100,
            bb_upper: Math.round(bb.upper * 100) / 100,
            bb_lower: Math.round(bb.lower * 100) / 100,
          },
          reason: `Bollinger breakout: price ${currentPrice.toFixed(0)} > upper ${bb.upper.toFixed(0)} (momentum: ${momentumPct.toFixed(1)}%)`,
        };
      }

      // Also buy near lower band in strong uptrend (mean reversion)
      const sma50 = sma(closes, 50);
      const isUptrend = currentPrice > sma50;
      const nearLowerBand = currentPrice <= bb.lower * 1.02;

      if (nearLowerBand && isUptrend && momentumPct > 0) {
        return {
          action: "buy",
          positionSize: positionSize * 0.7, // Smaller size for mean reversion
          indicators: {
            bb_mean_reversion: true,
            bb_width: Math.round(bbWidth * 100) / 100,
            momentum_pct: Math.round(momentumPct * 100) / 100,
          },
          reason: `Mean reversion: price near lower band in uptrend (momentum: ${momentumPct.toFixed(1)}%)`,
        };
      }
    }

    return {
      action: "hold",
      indicators: {
        bb_width: Math.round(bbWidth * 100) / 100,
        momentum_pct: Math.round(momentumPct * 100) / 100,
        bb_position: currentPrice > bb.upper ? "above_upper" : currentPrice < bb.lower ? "below_lower" : "inside",
      },
    };
  }
}
