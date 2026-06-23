/**
 * Tester for src/lib/backtest/engine.ts — C4 backtest-parity (Tasks 3–6).
 */

import { describe, it, expect } from 'vitest';
import {
  runBacktest,
  generateSignalsFromLog,
  type OHLCV,
} from '../engine';
import { roundToLotSize } from '../../trading/canonical/symbols/lot-sizes';
import { calculatePnlFromTrades, type TradePnlInput } from '../../trading/canonical/pnl/trade-pnl';

function makeCandles(
  count: number,
  startPrice: number,
  startTime = Date.now(),
): OHLCV[] {
  const candles: OHLCV[] = [];
  let price = startPrice;

  for (let i = 0; i < count; i++) {
    price = price * 1.001; // svakt stigende for å holde positive returer
    candles.push({
      timestamp: startTime + i * 24 * 60 * 60 * 1000,
      open: price * 0.999,
      high: price * 1.002,
      low: price * 0.998,
      close: price,
      volume: 1_000_000,
    });
  }

  return candles;
}

describe('Backtest engine parity', () => {
  it('returns unchanged result contract with shared strategies', () => {
    const candles = makeCandles(60, 50000);
    const result = runBacktest(candles, 'SMA_CROSSOVER', 10000, {
      symbol: 'BTCUSDT',
      maxPositionPct: 1.0,
    });

    expect(result).toHaveProperty('trades');
    expect(result).toHaveProperty('equityCurve');
    expect(result).toHaveProperty('metrics');
    expect(result).toHaveProperty('buyHoldReturn');
    expect(result).toHaveProperty('enhancedMetrics');
    expect(Array.isArray(result.trades)).toBe(true);
    expect(Array.isArray(result.equityCurve)).toBe(true);
  });

  it('applies canonical fill model (slippage + fee) in legacy external-signal path', () => {
    // Flat pris for å kunne forutsi slippage nøyaktig.
    const basePrice = 100;
    const candles = makeCandles(5, basePrice);
    const signals: ('BUY' | 'SELL' | 'HOLD')[] = [
      'HOLD',
      'BUY',
      'HOLD',
      'SELL',
      'HOLD',
    ];

    const result = runBacktest(
      candles,
      'SMA_CROSSOVER',
      10000,
      { symbol: 'ETHUSDT', maxPositionPct: 0.5, slippagePct: 0.05, feeRate: 0.001 },
      signals,
    );

    expect(result.trades.length).toBe(1);
    const trade = result.trades[0];
    const sellClose = candles[3].close;
    // Market sell får slippage mot ugunstig retning: 0.05 % lavere.
    expect(trade.exitPrice).toBeCloseTo(sellClose * (1 - 0.0005), 4);
    // Fee skal være rundtur (kjøpsfee + salgsfee), så den er > 0.
    expect(trade.fee).toBeGreaterThan(0);
  });

  it('rounds lot sizes to valid step sizes', () => {
    // ETH har stepSize 0.0001.
    const basePrice = 1234.56789;
    const candles = makeCandles(5, basePrice);
    const signals: ('BUY' | 'SELL' | 'HOLD')[] = [
      'HOLD',
      'BUY',
      'HOLD',
      'SELL',
      'HOLD',
    ];

    const initialCapital = 10000;
    const result = runBacktest(
      candles,
      'SMA_CROSSOVER',
      initialCapital,
      { symbol: 'ETHUSDT', maxPositionPct: 0.5, feeRate: 0.001 },
      signals,
    );

    const trade = result.trades[0];
    const rawQty =
      (initialCapital * 0.5 * (1 - 0.001)) / candles[1].close;
    const expectedQty = roundToLotSize('ETHUSDT', rawQty);

    expect(trade.size).toBe(expectedQty);
    expect(trade.size).toBeLessThanOrEqual(rawQty);
  });

  it('tracks FIFO cost basis across multiple buys in legacy path', () => {
    const basePrice = 100;
    const candles = makeCandles(6, basePrice);
    const signals: ('BUY' | 'SELL' | 'HOLD')[] = [
      'HOLD',
      'BUY',
      'BUY',
      'SELL',
      'HOLD',
      'HOLD',
    ];

    const result = runBacktest(
      candles,
      'SMA_CROSSOVER',
      10000,
      { symbol: 'ETHUSDT', maxPositionPct: 0.5, riskProfile: 'aggressiv', feeRate: 0.001 },
      signals,
    );

    expect(result.trades.length).toBe(1);
    const trade = result.trades[0];

    // Aggressiv profil gir kanonisk grense på 100 %, så to kjøp á 50 % av
    // gjenværende cash tillates. Entry-prisen blir et volumvektet gjennomsnitt.
    expect(trade.entryPrice).toBeGreaterThan(basePrice);
    expect(trade.size).toBeGreaterThan(0);
  });

  it('blocks legacy buys that exceed canonical risk profile limits', () => {
    const basePrice = 100;
    const candles = makeCandles(3, basePrice);
    const signals: ('BUY' | 'SELL' | 'HOLD')[] = ['BUY', 'HOLD', 'HOLD'];

    const result = runBacktest(
      candles,
      'SMA_CROSSOVER',
      10000,
      {
        symbol: 'BTCUSDT',
        maxPositionPct: 2.0,
        riskProfile: 'konservativ',
        feeRate: 0.001,
      },
      signals,
    );

    // Konservativ profil har kanonisk grense på 50 %, så 200 % kjøp blokkeres.
    expect(result.trades).toHaveLength(0);
    expect(result.equityCurve[result.equityCurve.length - 1].equity).toBeCloseTo(10000, 4);
  });

  it('allows buys within canonical risk profile limits', () => {
    const basePrice = 100;
    const candles = makeCandles(3, basePrice);
    const signals: ('BUY' | 'SELL' | 'HOLD')[] = ['BUY', 'HOLD', 'HOLD'];

    const result = runBacktest(
      candles,
      'SMA_CROSSOVER',
      10000,
      {
        symbol: 'BTCUSDT',
        maxPositionPct: 0.5,
        riskProfile: 'konservativ',
        feeRate: 0.001,
      },
      signals,
    );

    expect(result.trades.length).toBeGreaterThanOrEqual(1);
  });

  it('aligns legacy path P&L with canonical calculatePnlFromTrades', () => {
    const basePrice = 100;
    const candles = makeCandles(5, basePrice);
    const signals: ('BUY' | 'SELL' | 'HOLD')[] = [
      'HOLD',
      'BUY',
      'HOLD',
      'SELL',
      'HOLD',
    ];

    const initialCapital = 10000;
    const result = runBacktest(
      candles,
      'SMA_CROSSOVER',
      initialCapital,
      { symbol: 'ETHUSDT', maxPositionPct: 0.5, feeRate: 0.001, slippagePct: 0.05 },
      signals,
    );

    const trade = result.trades[0];
    const lastClose = candles[candles.length - 1].close;

    // Gjenskape kanonisk input fra trade-opplysningene.
    // Kjøpsprisen kan utledes fra effektiv kostnadsbasis.
    const buyExecutedPrice = trade.entryPrice / (1 + 0.001);
    const buyQty = trade.size;
    const buyFee = buyQty * buyExecutedPrice * 0.001;

    const inputs: TradePnlInput[] = [
      {
        symbol: 'ETHUSDT',
        side: 'buy',
        quantity: buyQty,
        price: buyExecutedPrice,
        fee: buyFee,
        timestamp: new Date(trade.entryTime).toISOString(),
        currency: 'USDT',
      },
      {
        symbol: 'ETHUSDT',
        side: 'sell',
        quantity: trade.size,
        price: trade.exitPrice,
        fee: trade.size * trade.exitPrice * 0.001,
        timestamp: new Date(trade.exitTime).toISOString(),
        currency: 'USDT',
      },
    ];

    const canonical = calculatePnlFromTrades(inputs, lastClose);
    const enginePnl = result.equityCurve[result.equityCurve.length - 1].equity - initialCapital;

    expect(result.metrics.totalReturnPct).toBeCloseTo(
      ((canonical.realizedPnl + canonical.unrealizedPnl) / initialCapital) * 100,
      4,
    );
    expect(enginePnl).toBeCloseTo(canonical.realizedPnl + canonical.unrealizedPnl, 2);
  });

  it('generates correct external signal array from AI decision log', () => {
    const candles = makeCandles(3, 100);
    const logSignals = [
      {
        timestamp: new Date(candles[1].timestamp).toISOString(),
        decision_type: 'buy',
        sentiment_score: 85,
      },
      {
        timestamp: new Date(candles[2].timestamp).toISOString(),
        decision_type: 'sell',
        sentiment_score: 90,
      },
    ];

    const signals = generateSignalsFromLog(candles, logSignals);
    expect(signals[0]).toBe('HOLD');
    expect(signals[1]).toBe('BUY');
    expect(signals[2]).toBe('SELL');
  });
});
