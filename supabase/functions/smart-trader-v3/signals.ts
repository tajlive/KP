/**
 * Signalgenerering basert på tekniske indikatorer.
 */

import type { SignalResult, IndicatorSnapshot, SmartTraderConfig } from "./types.ts";
import { rsi, sma, momentum } from "./indicators.ts";
import type { Direction } from "./types.ts";

interface Kline {
  close: number;
}

/**
 * Evaluer markedet og returner et signal (kjøp/salg/hold).
 */
export function evaluateSignal(
  klines: Kline[],
  config: SmartTraderConfig,
): SignalResult {
  const closes = klines.map((k) => k.close);
  const rsiVals = rsi(closes, config.rsiPeriod);
  const smaFastVals = sma(closes, config.smaFastPeriod);
  const smaSlowVals = sma(closes, config.smaSlowPeriod);
  const momentumVals = momentum(closes, config.momentumPeriod);

  const latestRsi = rsiVals[rsiVals.length - 1];
  const prevRsi = rsiVals.length >= 2 ? rsiVals[rsiVals.length - 2] : null;
  const latestSmaFast = smaFastVals[smaFastVals.length - 1];
  const prevSmaFast = smaFastVals.length >= 2 ? smaFastVals[smaFastVals.length - 2] : null;
  const latestSmaSlow = smaSlowVals[smaSlowVals.length - 1];
  const latestMomentum = momentumVals[momentumVals.length - 1];
  const currentPrice = closes[closes.length - 1];

  const reasons: string[] = [];
  let direction: Direction = 'hold';
  let confidence = 0;

  // RSI-signaler
  if (latestRsi !== null) {
    if (latestRsi <= config.rsiOversoldThreshold) {
      // Oversolgt — mulig kjøp
      direction = 'buy';
      confidence += 35;
      reasons.push(`RSI ${latestRsi.toFixed(1)} — oversolgt (terskel ${config.rsiOversoldThreshold})`);
    } else if (latestRsi >= config.rsiOverboughtThreshold) {
      // Overkjøpt — mulig salg
      direction = 'sell';
      confidence += 30;
      reasons.push(`RSI ${latestRsi.toFixed(1)} — overkjøpt (terskel ${config.rsiOverboughtThreshold})`);
    }

    // RSI-divergens
    if (prevRsi !== null) {
      if (prevRsi <= config.rsiOversoldThreshold && latestRsi > prevRsi) {
        direction = 'buy';
        confidence += 15;
        reasons.push('RSI bullish divergens');
      } else if (prevRsi >= config.rsiOverboughtThreshold && latestRsi < prevRsi) {
        direction = 'sell';
        confidence += 10;
        reasons.push('RSI bearish divergens');
      }
    }
  }

  // SMA crossover
  if (latestSmaFast !== null && latestSmaSlow !== null && prevSmaFast !== null) {
    const newCross = prevSmaFast <= latestSmaSlow && latestSmaFast > latestSmaSlow;
    const deathCross = prevSmaFast >= latestSmaSlow && latestSmaFast < latestSmaSlow;

    if (newCross) {
      direction = 'buy';
      confidence += 30;
      reasons.push(`Golden cross — SMA${config.smaFastPeriod} krysset over SMA${config.smaSlowPeriod}`);
    } else if (deathCross) {
      direction = 'sell';
      confidence += 25;
      reasons.push(`Death cross — SMA${config.smaFastPeriod} krysset under SMA${config.smaSlowPeriod}`);
    }

    // Pris i forhold til SMA
    if (currentPrice > latestSmaFast && direction === 'hold') {
      confidence += 5;
      reasons.push('Pris over SMA — bullish trend');
    } else if (currentPrice < latestSmaFast && direction === 'hold') {
      confidence -= 5;
    }
  }

  // Momentum
  if (latestMomentum !== null) {
    if (latestMomentum > 2) {
      confidence += 10;
      if (direction === 'hold') {
        direction = 'buy';
        reasons.push(`Positivt momentum: ${latestMomentum.toFixed(1)}%`);
      } else {
        reasons.push(`Momentum bekrefter signal: ${latestMomentum.toFixed(1)}%`);
      }
    } else if (latestMomentum < -2) {
      confidence += 5;
      if (direction === 'hold') {
        direction = 'sell';
        reasons.push(`Negativt momentum: ${latestMomentum.toFixed(1)}%`);
      } else {
        reasons.push(`Momentum bekrefter signal: ${latestMomentum.toFixed(1)}%`);
      }
    }
  }

  // Kap confidence mellom 0-100
  confidence = Math.max(0, Math.min(100, confidence));

  // Kun kjøp/salg ved > 40 confidence
  if (confidence < 40) {
    direction = 'hold';
    reasons.length = 0;
    reasons.push('Ingen klare signaler (confidence < 40)');
  }

  const indicatorSnapshot: IndicatorSnapshot = {
    rsi: latestRsi ?? 50,
    smaFast: latestSmaFast,
    smaSlow: latestSmaSlow,
    momentum: latestMomentum,
    currentPrice,
    timestamp: new Date().toISOString(),
  };

  return { direction, confidence, reasons, indicators: indicatorSnapshot };
}
