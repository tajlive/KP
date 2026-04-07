/**
 * Build Trade Reason - Mapper intern logikk til reasonCode + params
 * 
 * Konverterer tekniske indikatorer (RSI, SMA, etc.) til
 * TradeReasonCode og TradeReasonParams for lagring og forklaring.
 */

import type {
  TradeReasonCode,
  TradeReasonParams,
  IndicatorSnapshot,
  TradeSide,
} from "@/types/trading";

export type SignalIndicators = {
  strategy?: string;
  rsi?: number;
  macd?: number;
  signal?: number;
  fast_sma?: number;
  slow_sma?: number;
  crossedAbove?: boolean;
  crossedBelow?: boolean;
  pnl_pct?: number;
  target?: number;
  stop_loss?: number;
  interval?: number;
  volatility_adjusted?: boolean;
  grid_level?: number;
  buy_at?: number;
  sell_at?: number;
  drop_from_peak?: number;
  trailing_stop?: boolean;
  partial_tp?: boolean;
  buy_signals?: number;
  sell_signals?: number;
  [key: string]: boolean | number | string | undefined;
}

export interface BuildReasonInput {
  side: TradeSide;
  strategyKey: string;
  indicators: SignalIndicators | Record<string, unknown> | undefined | null;
  currentPrice: number;
  candles: Array<{ close: number; high?: number; low?: number }>;
  entryPrice?: number;
}

/**
 * Bygg indicator snapshot fra candle-data
 */
export function buildIndicatorSnapshot(
  candles: Array<{ close: number; high?: number; low?: number }>,
  indicators: SignalIndicators | Record<string, unknown> | null
): IndicatorSnapshot {
  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];
  const price24hAgo = closes.length >= 24 ? closes[closes.length - 24] : closes[0];
  
  // Beregn volatilitet (ATR-simple)
  let volatility = 0;
  if (closes.length >= 14) {
    const ranges = [];
    for (let i = closes.length - 14; i < closes.length; i++) {
      const high = candles[i]?.high || closes[i];
      const low = candles[i]?.low || closes[i];
      ranges.push(high - low);
    }
    volatility = ranges.reduce((a, b) => a + b, 0) / ranges.length;
  }

  // Helper to safely get number from indicators
  const getNum = (key: string): number | undefined => {
    const val = indicators?.[key];
    return typeof val === 'number' ? val : undefined;
  };

  return {
    price: currentPrice,
    price_24h_ago: price24hAgo,
    rsi: getNum('rsi'),
    macd: getNum('macd'),
    macd_signal: getNum('signal'),
    sma_20: getNum('fast_sma'),
    sma_50: getNum('slow_sma'),
    volatility,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mapper strategi og indikatorer til TradeReasonCode
 */
export function buildTradeReason(
  input: BuildReasonInput
): {
  reasonCode: TradeReasonCode;
  reasonParams: TradeReasonParams;
} {
  const { side, strategyKey, indicators, currentPrice, candles, entryPrice } = input;

  // Helper to safely get values from indicators
  const get = (key: string): unknown => indicators?.[key];
  const getNum = (key: string): number | undefined => {
    const val = get(key);
    return typeof val === 'number' ? val : undefined;
  };
  const getBool = (key: string): boolean | undefined => {
    const val = get(key);
    return typeof val === 'boolean' ? val : undefined;
  };

  const closes = candles.map((c) => c.close);
  const price24hAgo = closes.length >= 24 ? closes[closes.length - 24] : closes[0];
  const priceChange24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;

  // Default params
  const baseParams: TradeReasonParams = {
    priceChange24h: Math.round(priceChange24h * 100) / 100,
  };

  // === KJØP-REASONS ===
  if (side === "buy") {
    // Grid strategy
    const gridLevel = getNum('grid_level');
    if (strategyKey === "grid" || gridLevel !== undefined) {
      return {
        reasonCode: "GRID_BUY",
        reasonParams: {
          ...baseParams,
          gridLevel,
        },
      };
    }

    // DCA strategy
    const interval = getNum('interval');
    if (strategyKey === "dca" || interval !== undefined) {
      return {
        reasonCode: "DCA_INTERVAL_BUY",
        reasonParams: {
          ...baseParams,
          intervalMinutes: interval,
        },
      };
    }

    // RSI dip buy
    const rsi = getNum('rsi');
    if (rsi !== undefined && rsi < 45) {
      return {
        reasonCode: "RSI_DIP_BUY",
        reasonParams: {
          ...baseParams,
          rsi: Math.round(rsi * 10) / 10,
        },
      };
    }

    // SMA crossover
    if (getBool('crossedAbove') === true) {
      return {
        reasonCode: "SMA_CROSSOVER_BUY",
        reasonParams: {
          ...baseParams,
          smaFast: Math.round((getNum('fast_sma') || 0) * 100) / 100,
          smaSlow: Math.round((getNum('slow_sma') || 0) * 100) / 100,
        },
      };
    }

    // Multi-signal
    const buySignals = getNum('buy_signals');
    const sellSignals = getNum('sell_signals');
    if (buySignals !== undefined || sellSignals !== undefined) {
      return {
        reasonCode: "MULTI_SIGNAL_BUY",
        reasonParams: {
          ...baseParams,
          confidence: buySignals 
            ? Math.round((buySignals / 3) * 100) / 100 
            : undefined,
        },
      };
    }

    // Trend breakout
    if (strategyKey === "trend_follow" || strategyKey === "trend") {
      return {
        reasonCode: "TREND_BREAKOUT_BUY",
        reasonParams: baseParams,
      };
    }

    // Mean reversion
    if (strategyKey === "mean_reversion") {
      return {
        reasonCode: "MEAN_REVERSION_BUY",
        reasonParams: {
          ...baseParams,
          rsi: rsi !== undefined ? Math.round(rsi * 10) / 10 : undefined,
        },
      };
    }

    // Fallback buy
    return {
      reasonCode: "MULTI_SIGNAL_BUY",
      reasonParams: baseParams,
    };
  }

  // === SALG-REASONS ===
  if (side === "sell") {
    const trailingStop = getBool('trailing_stop');
    const dropFromPeak = getNum('drop_from_peak');
    const target = getNum('target');
    const pnlPct = getNum('pnl_pct');
    const stopLoss = getNum('stop_loss');
    
    // Trailing take profit
    if (trailingStop === true || dropFromPeak !== undefined) {
      return {
        reasonCode: "TRAILING_TP_SELL",
        reasonParams: {
          ...baseParams,
          dropFromPeak: dropFromPeak !== undefined 
            ? Math.round(dropFromPeak * 100) / 100 
            : undefined,
        },
      };
    }

    // Partial take profit
    if (getBool('partial_tp') === true) {
      return {
        reasonCode: "PARTIAL_TP_SELL",
        reasonParams: {
          ...baseParams,
          profitPct: entryPrice 
            ? Math.round(((currentPrice - entryPrice) / entryPrice) * 10000) / 100 
            : undefined,
        },
      };
    }

    // Regular take profit
    if (target !== undefined && pnlPct !== undefined) {
      if (pnlPct > 0) {
        return {
          reasonCode: "TAKE_PROFIT_SELL",
          reasonParams: {
            ...baseParams,
            profitPct: Math.round(pnlPct * 100) / 100,
          },
        };
      }
    }

    // Stop loss
    if (stopLoss !== undefined && pnlPct !== undefined) {
      if (pnlPct < 0) {
        return {
          reasonCode: "STOP_LOSS_SELL",
          reasonParams: {
            ...baseParams,
            lossPct: Math.round(Math.abs(pnlPct) * 100) / 100,
          },
        };
      }
    }

    // SMA crossover sell
    if (getBool('crossedBelow') === true) {
      return {
        reasonCode: "SMA_CROSSOVER_SELL",
        reasonParams: {
          ...baseParams,
          smaFast: Math.round((getNum('fast_sma') || 0) * 100) / 100,
          smaSlow: Math.round((getNum('slow_sma') || 0) * 100) / 100,
        },
      };
    }

    // Trend reversal
    if (strategyKey === "trend_follow" || strategyKey === "trend") {
      return {
        reasonCode: "TREND_REVERSAL_SELL",
        reasonParams: baseParams,
      };
    }

    // Fallback sell with PnL
    if (pnlPct !== undefined && pnlPct > 0) {
      return {
        reasonCode: "TAKE_PROFIT_SELL",
        reasonParams: {
          ...baseParams,
          profitPct: Math.round(pnlPct * 100) / 100,
        },
      };
    }

    return {
      reasonCode: "STOP_LOSS_SELL",
      reasonParams: baseParams,
    };
  }

  // Fallback
  return {
    reasonCode: "UNKNOWN",
    reasonParams: baseParams,
  };
}

/**
 * Map strategy_id til strategyKey
 */
export function resolveStrategyKey(strategyId: string): string {
  const normalized = strategyId.toLowerCase();
  
  if (normalized.includes("grid")) return "grid";
  if (normalized.includes("dca")) return "dca";
  if (normalized.includes("trend")) return "trend_follow";
  if (normalized.includes("multi")) return "multi_signal";
  if (normalized.includes("breakout")) return "breakout";
  if (normalized.includes("mean")) return "mean_reversion";
  
  return normalized;
}
