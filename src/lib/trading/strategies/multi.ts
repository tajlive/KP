/**
 * Multi-Signal Strategy — RSI + MACD + Momentum + Bollinger Bands
 *
 * Kjøper bare når minst 2 av 3 indikatorer er enige.
 * Bollinger Bands gir bedre entry-nivåer.
 *
 * V2: Dynamisk parametere per config. Ingen hard-coded verdier.
 */

import type { MinimalSession, StrategyEngine, StrategyInput, StrategySignal } from "./types";
import { rsi, macd, bollingerBands, atr } from "./indicators";

export interface MultiConfig {
  rsi_buy_threshold?: number;
  rsi_sell_threshold?: number;
  rsi_period?: number;
  macd_fast?: number;
  macd_slow?: number;
  macd_signal?: number;
  momentum_period?: number;
  use_bollinger?: boolean;
  min_confidence?: number;
  position_size?: number;
  max_position_size?: number;
  trailing_stop_atr_mult?: number;
  use_volume_filter?: boolean;
  use_rsi_divergence?: boolean;
}

export class MultiSignalStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session } = input;
    const cfg: MultiConfig = (input.config as MultiConfig) ?? {};

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const volumes = candles.map((c) => c.volume);

    const rsiPeriod = cfg.rsi_period ?? 14;
    const macdFast = cfg.macd_fast ?? 12;
    const macdSlow = cfg.macd_slow ?? 26;
    const macdSignal = cfg.macd_signal ?? 9;
    const momentumPeriod = cfg.momentum_period ?? 5;
    const minConfidence = cfg.min_confidence ?? 2;
    const positionSize = cfg.position_size ?? 0.1;
    const trailingAtrMult = cfg.trailing_stop_atr_mult ?? 2;

    if (closes.length < Math.max(rsiPeriod, macdSlow, momentumPeriod) + 5) {
      return { action: "hold", reason: "Insufficient data" };
    }

    const rsiValue = rsi(closes, rsiPeriod);
    const macdData = macd(closes, macdFast, macdSlow, macdSignal);

    // Bollinger Bands for better entries
    const bb = bollingerBands(closes, 20, 2);
    const currentPrice = closes[closes.length - 1];
    const nearLowerBand = currentPrice <= bb.lower * 1.01;
    const nearUpperBand = currentPrice >= bb.upper * 0.99;

    const rsiBuyThreshold = cfg.rsi_buy_threshold ?? 45;
    const rsiSellThreshold = cfg.rsi_sell_threshold ?? 55;

    // Count signals
    let buySignals = 0;
    let sellSignals = 0;

    // RSI signal
    if (rsiValue < rsiBuyThreshold) buySignals++;
    if (rsiValue > rsiSellThreshold) sellSignals++;

    // MACD signal (line crosses above signal)
    if (macdData.macd > macdData.signal) buySignals++;
    if (macdData.macd < macdData.signal) sellSignals++;

    // Momentum signal (price vs N periods ago)
    if (closes[closes.length - 1] > closes[closes.length - momentumPeriod]) buySignals++;
    if (closes[closes.length - 1] < closes[closes.length - momentumPeriod]) sellSignals++;

    // Bollinger confirmation
    if (cfg.use_bollinger !== false) {
      if (nearLowerBand) buySignals += 0.5;
      if (nearUpperBand) sellSignals += 0.5;
    }

    // RSI Divergence detection (price makes lower low, RSI makes higher low)
    if (cfg.use_rsi_divergence) {
      const divResult = this.detectRSIDivergence(closes, rsiPeriod);
      if (divResult.bullishDivergence) buySignals += 0.5;
      if (divResult.bearishDivergence) sellSignals += 0.5;
    }

    // Volume filter: require above-average volume for signal confirmation
    if (cfg.use_volume_filter && volumes.length >= 20) {
      const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
      const currentVolume = volumes[volumes.length - 1];
      if (currentVolume < avgVolume * 0.8) {
        buySignals *= 0.7;
        sellSignals *= 0.7;
      }
    }

    const totalBuy = Math.floor(buySignals);
    const totalSell = Math.floor(sellSignals);

    const indicators = {
      rsi: Math.round(rsiValue * 10) / 10,
      macd: Math.round(macdData.macd * 1000) / 1000,
      signal: Math.round(macdData.signal * 1000) / 1000,
      bollinger_lower: Math.round(bb.lower * 100) / 100,
      bollinger_upper: Math.round(bb.upper * 100) / 100,
      buy_signals: totalBuy,
      sell_signals: totalSell,
      confidence: Math.max(totalBuy, totalSell),
      rsi_period: rsiPeriod,
      macd_params: `${macdFast}/${macdSlow}/${macdSignal}`,
    };

    // Trailing stop check on open positions
    if (session.open_position) {
      const entryPrice = session.open_position.entry_price;
      const highestPrice = session.open_position.highest_price ?? entryPrice;
      const dropFromPeak = ((highestPrice - currentPrice) / highestPrice) * 100;
      const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;

      if (candles.length >= 14) {
        const atrValue = atr(highs, lows, closes, 14);
        const trailingStopPct = (trailingAtrMult * atrValue / entryPrice) * 100;
        if (dropFromPeak >= trailingStopPct && pnlPct > 0) {
          return {
            action: "sell",
            positionSize,
            indicators: {
              ...indicators,
              trailing_stop: true,
              drop_from_peak: Math.round(dropFromPeak * 100) / 100,
              atr_stop_pct: Math.round(trailingStopPct * 100) / 100,
            },
            reason: `Trailing stop: price dropped ${dropFromPeak.toFixed(1)}% from peak (ATR×${trailingAtrMult})`,
          };
        }
      }
    }

    // Buy: need minConfidence signals, no position, and not overbought
    if (totalBuy >= minConfidence && !session.open_position && rsiValue < 70) {
      return {
        action: "buy",
        positionSize,
        indicators,
        reason: `${totalBuy}/3 signals bullish${nearLowerBand ? ' (BB lower band)' : ''} — RSI ${rsiValue.toFixed(1)}, MACD ${macdData.macd > macdData.signal ? '+' : '-'}`,
      };
    }

    // Sell: need minConfidence signals, have position, and not oversold
    if (totalSell >= minConfidence && session.open_position && rsiValue > 30) {
      return {
        action: "sell",
        positionSize,
        indicators,
        reason: `${totalSell}/3 signals bearish${nearUpperBand ? ' (BB upper band)' : ''} — RSI ${rsiValue.toFixed(1)}, MACD ${macdData.macd < macdData.signal ? '-' : '+'}`,
      };
    }

    return { action: "hold", indicators };
  }

  private detectRSIDivergence(
    closes: number[],
    rsiPeriod: number,
  ): { bullishDivergence: boolean; bearishDivergence: boolean } {
    if (closes.length < rsiPeriod * 3) {
      return { bullishDivergence: false, bearishDivergence: false };
    }

    const rsiValues: number[] = [];
    for (let i = rsiPeriod; i < closes.length; i++) {
      rsiValues.push(rsi(closes.slice(0, i + 1), rsiPeriod));
    }

    // Find last 2 swing lows in price
    const priceLows: { idx: number; price: number }[] = [];
    for (let i = 2; i < closes.length - 2; i++) {
      if (closes[i] < closes[i - 1] && closes[i] < closes[i - 2] &&
          closes[i] < closes[i + 1] && closes[i] < closes[i + 2]) {
        priceLows.push({ idx: i, price: closes[i] });
      }
    }

    // Find last 2 swing highs in price
    const priceHighs: { idx: number; price: number }[] = [];
    for (let i = 2; i < closes.length - 2; i++) {
      if (closes[i] > closes[i - 1] && closes[i] > closes[i - 2] &&
          closes[i] > closes[i + 1] && closes[i] > closes[i + 2]) {
        priceHighs.push({ idx: i, price: closes[i] });
      }
    }

    let bullishDivergence = false;
    if (priceLows.length >= 2) {
      const lastLow = priceLows[priceLows.length - 1];
      const prevLow = priceLows[priceLows.length - 2];
      const lastRSI = rsiValues[lastLow.idx - rsiPeriod];
      const prevRSI = rsiValues[prevLow.idx - rsiPeriod];
      if (lastLow.price < prevLow.price && lastRSI > prevRSI) {
        bullishDivergence = true;
      }
    }

    let bearishDivergence = false;
    if (priceHighs.length >= 2) {
      const lastHigh = priceHighs[priceHighs.length - 1];
      const prevHigh = priceHighs[priceHighs.length - 2];
      const lastRSI = rsiValues[lastHigh.idx - rsiPeriod];
      const prevRSI = rsiValues[prevHigh.idx - rsiPeriod];
      if (lastHigh.price > prevHigh.price && lastRSI < prevRSI) {
        bearishDivergence = true;
      }
    }

    return { bullishDivergence, bearishDivergence };
  }
}
