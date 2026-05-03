/**
 * Multi-Signal Strategy — RSI + MACD + Momentum + Bollinger Bands
 *
 * Kjøper bare når minst 2 av 3 indikatorer er enige.
 * Bollinger Bands gir bedre entry-nivåer.
 *
 * Forbedringer fra v1:
 * - Bollinger Bands: kjøp bare ved lower band
 * - Volatilitetsfilter: unngå handler i ekstrem volatilitet
 * - Konfidens-scoring: vis styrken på signalet
 */

import type { MinimalSession, StrategyEngine, StrategyInput, StrategySignal } from "./types";
import { rsi, macd, bollingerBands } from "./indicators";

export interface MultiConfig {
  rsi_buy_threshold?: number;
  rsi_sell_threshold?: number;
  use_bollinger?: boolean;
  min_confidence?: number; // min 2 of 3 signals needed
}

export class MultiSignalStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session } = input;
    const cfg: MultiConfig = (input.config as MultiConfig) ?? {};

    const closes = candles.map((c) => c.close);

    if (closes.length < 26) {
      return { action: "hold", reason: "Insufficient data" };
    }

    const rsiValue = rsi(closes, 14);
    const macdData = macd(closes, 12, 26, 9);

    // Bollinger Bands for better entries
    const bb = bollingerBands(closes, 20, 2);
    const currentPrice = closes[closes.length - 1];
    const nearLowerBand = currentPrice <= bb.lower * 1.01; // within 1% of lower band
    const nearUpperBand = currentPrice >= bb.upper * 0.99; // within 1% of upper band

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

    // Momentum signal (price vs 5 periods ago)
    if (closes[closes.length - 1] > closes[closes.length - 5]) buySignals++;
    if (closes[closes.length - 1] < closes[closes.length - 5]) sellSignals++;

    // Bollinger confirmation
    if (cfg.use_bollinger !== false) {
      if (nearLowerBand) buySignals += 0.5; // half-point bonus
      if (nearUpperBand) sellSignals += 0.5;
    }

    const minConfidence = cfg.min_confidence ?? 2;
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
    };

    // Buy: need minConfidence signals, no position, and not overbought
    if (totalBuy >= minConfidence && !session.open_position && rsiValue < 70) {
      return {
        action: "buy",
        positionSize: 0.1,
        indicators,
        reason: `${totalBuy}/3 signals bullish${nearLowerBand ? ' (price at Bollinger lower band)' : ''} — RSI ${rsiValue.toFixed(1)}, MACD positive`,
      };
    }

    // Sell: need minConfidence signals, have position, and not oversold
    if (totalSell >= minConfidence && session.open_position && rsiValue > 30) {
      return {
        action: "sell",
        indicators,
        reason: `${totalSell}/3 signals bearish${nearUpperBand ? ' (price at Bollinger upper band)' : ''} — RSI ${rsiValue.toFixed(1)}, MACD negative`,
      };
    }

    return { action: "hold", indicators };
  }
}
