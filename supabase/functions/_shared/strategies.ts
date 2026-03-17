/**
 * Shared Trading Strategies for Supabase Edge Functions
 * Deno-compatible module for auto trading strategies
 */

import { isVolumeConfirmed } from './volume.ts';

// ── Typer ────────────────────────────────────────────────────────────────────

export type Action = 'BUY' | 'SELL' | 'HOLD';
export type StrategyType = 'dca_trygg' | 'trend_balansert' | 'multisignal_aktiv' | 'grid_bot' | 'ai_copy';

export interface Signal {
  strategy_type: string;
  symbol: string;
  action: Action;
  confidence: number;
  reason: string;
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
}

export interface StrategyConfig {
  id: string;
  user_id: string;
  strategy_type: StrategyType;
  symbol?: string;
  capital_allocation?: number;
  trading_mode: 'paper' | 'live';
  is_enabled: boolean;
}

// ── Tekniske indikatorer ─────────────────────────────────────────────────────

export function sma(data: number[], period: number): number[] {
  return data.map((_, i) => {
    if (i < period - 1) return NaN;
    return data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
  });
}

export function rsi(closes: number[], period = 14): number[] {
  const out = new Array<number>(closes.length).fill(NaN);
  if (closes.length < period + 1) return out;
  
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    out[i + 1] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  
  return out;
}

/** Average True Range (ATR) - returns single value for last period */
export function atr(klines: number[][], period = 14): number {
  if (klines.length < period + 1) return NaN;
  const highs = klines.map((k) => parseFloat(String(k[2])));
  const lows = klines.map((k) => parseFloat(String(k[3])));
  const closes = klines.map((k) => parseFloat(String(k[4])));
  const tr: number[] = [highs[0] - lows[0]];
  for (let i = 1; i < klines.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    tr.push(Math.max(hl, hc, lc));
  }
  const lastTr = tr.slice(-period);
  return lastTr.reduce((a, b) => a + b, 0) / period;
}

// ── Binance API Helpers ──────────────────────────────────────────────────────

const BINANCE_API_BASE = 'https://api.binance.com';

export async function fetchKlines(
  symbol: string, 
  interval: string, 
  limit = 220
): Promise<number[][]> {
  const url = `${BINANCE_API_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance klines HTTP ${res.status} for ${symbol}`);
  return res.json();
}

export async function fetchPrice(symbol: string): Promise<number> {
  const res = await fetch(`${BINANCE_API_BASE}/api/v3/ticker/price?symbol=${symbol}`);
  if (!res.ok) throw new Error(`Binance price HTTP ${res.status} for ${symbol}`);
  const data = await res.json();
  return parseFloat(data.price);
}

// ── Strategier ───────────────────────────────────────────────────────────────

/**
 * DCA Trygg: Fast kjøp ukentlig
 * Brukes av cron schedule - returnerer alltid BUY
 */
export async function evaluateDCA(symbol = 'BTCUSDT'): Promise<Signal> {
  const price = await fetchPrice(symbol);
  const sl = price * 0.95;  // 5% stop-loss
  const tp = price * 1.10;  // 10% take-profit
  
  return {
    strategy_type: 'dca_trygg',
    symbol,
    action: 'BUY',
    confidence: 1.0,
    reason: 'DCA: ugentlig kjøp til markedspris',
    entry_price: price,
    stop_loss: sl,
    take_profit: tp,
  };
}

/**
 * Trend Balansert: Golden/Death Cross på MA50/MA200 med RSI-filter
 */
export async function evaluateTrend(symbol = 'BTCUSDT'): Promise<Signal> {
  const klines = await fetchKlines(symbol, '1d', 220);
  const closes = klines.map((k) => parseFloat(String(k[4])));
  const ma50 = sma(closes, 50);
  const ma200 = sma(closes, 200);
  const rsiArr = rsi(closes);
  const i = closes.length - 1;
  const price = closes[i];

  const goldenCross = ma50[i] > ma200[i] && ma50[i - 1] <= ma200[i - 1];
  const deathCross = ma50[i] < ma200[i] && ma50[i - 1] >= ma200[i - 1];
  const rsiVal = rsiArr[i];

  if (goldenCross && rsiVal > 35 && rsiVal < 70) {
    const candles = klines.map((k) => ({
      close: parseFloat(String(k[4])),
      volume: parseFloat(String(k[5])),
    }));
    const volCheck = isVolumeConfirmed(candles, 20);
    const confidence = volCheck.confirmed ? 0.8 : 0.8 * 0.7;
    return {
      strategy_type: 'trend_balansert',
      symbol,
      action: 'BUY',
      confidence,
      reason: `Golden Cross MA50=${ma50[i].toFixed(0)} > MA200=${ma200[i].toFixed(0)}, RSI=${rsiVal.toFixed(1)}${volCheck.confirmed ? '' : ` (vol ratio ${volCheck.ratio.toFixed(2)} < 1.2)`}`,
      entry_price: price,
      stop_loss: price * 0.93,
      take_profit: price * 1.15,
    };
  }
  
  if (deathCross) {
    const candles = klines.map((k) => ({
      close: parseFloat(String(k[4])),
      volume: parseFloat(String(k[5])),
    }));
    const volCheck = isVolumeConfirmed(candles, 20);
    const confidence = volCheck.confirmed ? 0.75 : 0.75 * 0.7;
    return {
      strategy_type: 'trend_balansert',
      symbol,
      action: 'SELL',
      confidence,
      reason: `Death Cross MA50=${ma50[i].toFixed(0)} < MA200=${ma200[i].toFixed(0)}${volCheck.confirmed ? '' : ` (vol ratio ${volCheck.ratio.toFixed(2)} < 1.2)`}`,
      entry_price: price,
    };
  }
  
  return {
    strategy_type: 'trend_balansert',
    symbol,
    action: 'HOLD',
    confidence: 0.5,
    reason: `MA50=${ma50[i].toFixed(0)} MA200=${ma200[i].toFixed(0)} RSI=${rsiVal.toFixed(1)} – ingen kryss`,
  };
}

/**
 * Multi-Signal Aktiv: RSI oversold + 4h momentum
 */
export async function evaluateMultiSignal(symbol = 'BTCUSDT'): Promise<Signal> {
  const klines = await fetchKlines(symbol, '4h', 50);
  const closes = klines.map((k) => parseFloat(String(k[4])));
  const rsiArr = rsi(closes);
  const i = closes.length - 1;
  const price = closes[i];
  const rsiVal = rsiArr[i];

  let score = 0;
  const reasons: string[] = [];

  if (rsiVal < 35) { 
    score++; 
    reasons.push(`RSI=${rsiVal.toFixed(1)} oversold`);
  }
  
  const change4h = ((closes[i] - closes[i - 4]) / closes[i - 4]) * 100;
  if (change4h > 0.5) { 
    score++; 
    reasons.push(`4h momentum +${change4h.toFixed(2)}%`);
  }
  
  const ma20 = sma(closes, 20);
  if (price > ma20[i]) { 
    score++; 
    reasons.push(`pris over MA20=${ma20[i].toFixed(0)}`);
  }

  if (score >= 2) {
    const candles = klines.map((k) => ({
      close: parseFloat(String(k[4])),
      volume: parseFloat(String(k[5])),
    }));
    const volCheck = isVolumeConfirmed(candles, 20);
    const baseConf = score / 3;
    const confidence = volCheck.confirmed ? baseConf : baseConf * 0.7;
    return {
      strategy_type: 'multisignal_aktiv',
      symbol,
      action: 'BUY',
      confidence,
      reason: reasons.join(' | ') + (volCheck.confirmed ? '' : ` (vol ${volCheck.ratio.toFixed(2)}x)`),
      entry_price: price,
      stop_loss: price * 0.97,
      take_profit: price * 1.06,
    };
  }
  
  if (rsiVal > 70) {
    const candles = klines.map((k) => ({
      close: parseFloat(String(k[4])),
      volume: parseFloat(String(k[5])),
    }));
    const volCheck = isVolumeConfirmed(candles, 20);
    const confidence = volCheck.confirmed ? 0.65 : 0.65 * 0.7;
    return {
      strategy_type: 'multisignal_aktiv',
      symbol,
      action: 'SELL',
      confidence,
      reason: `RSI=${rsiVal.toFixed(1)} overkjøpt${volCheck.confirmed ? '' : ` (vol ${volCheck.ratio.toFixed(2)}x)`}`,
      entry_price: price,
    };
  }
  
  return {
    strategy_type: 'multisignal_aktiv',
    symbol,
    action: 'HOLD',
    confidence: 0.5,
    reason: `Score ${score}/3 – utilstrekkelig bekreftelse`,
  };
}

/** Grid Bot params from strategy_config (camelCase or snake_case) */
export interface GridBotParams {
  gridUpperPrice?: number;
  gridLowerPrice?: number;
  numGrids?: number;
  gridProfitPercent?: number;
  entryPrice?: number;
  hasPosition?: boolean;
  /** Aliases for strategy_config compatibility */
  upper_price?: number;
  lower_price?: number;
  grid_levels?: number;
}

/**
 * Grid Bot: Grid trading at evenly spaced price levels
 * Buy at grid levels, sell at buy_price * (1 + profitPercent)
 */
export async function evaluateGridBot(
  symbol = 'BTCUSDT',
  params?: GridBotParams
): Promise<Signal> {
  const price = await fetchPrice(symbol);
  const lower = params?.gridLowerPrice ?? params?.lower_price ?? price * 0.9;
  const upper = params?.gridUpperPrice ?? params?.upper_price ?? price * 1.1;
  const numGrids = params?.numGrids ?? params?.grid_levels ?? 10;
  const profitPercent = (params?.gridProfitPercent ?? 1) / 100;
  const hasPosition = params?.hasPosition ?? false;
  const entryPrice = params?.entryPrice ?? price;

  if (price > upper || price < lower) {
    return {
      strategy_type: 'grid_bot',
      symbol,
      action: 'HOLD',
      confidence: 0.5,
      reason: `Pris ${price.toFixed(0)} utenfor grid ${lower.toFixed(0)}–${upper.toFixed(0)}`,
      entry_price: price,
    };
  }

  const klines = await fetchKlines(symbol, '1h', 50);
  const atrVal = atr(klines, 14);
  const range = upper - lower;
  const spacing = !Number.isNaN(atrVal) && atrVal > 0 ? atrVal : range / numGrids;

  const gridLevels: number[] = [];
  for (let i = 0; i <= numGrids; i++) {
    gridLevels.push(lower + spacing * i);
  }

  const TOLERANCE = 0.005;

  if (!hasPosition) {
    for (let i = 0; i < gridLevels.length; i++) {
      const buyLevel = gridLevels[i];
      const diff = Math.abs(price - buyLevel) / buyLevel;
      if (diff <= TOLERANCE) {
        const sellTarget = buyLevel * (1 + profitPercent);
        return {
          strategy_type: 'grid_bot',
          symbol,
          action: 'BUY',
          confidence: 0.85,
          reason: `Grid kjøp ved nivå ${i} ($${buyLevel.toFixed(0)})`,
          entry_price: price,
          stop_loss: buyLevel * 0.95,
          take_profit: sellTarget,
        };
      }
    }
  } else {
    const sellTarget = entryPrice * (1 + profitPercent);
    const diff = Math.abs(price - sellTarget) / sellTarget;
    if (price >= sellTarget || diff <= TOLERANCE) {
      return {
        strategy_type: 'grid_bot',
        symbol,
        action: 'SELL',
        confidence: 0.9,
        reason: `Grid salg ved målnivå (entry ${entryPrice.toFixed(0)} → target ${sellTarget.toFixed(0)})`,
        entry_price: price,
      };
    }
  }

  return {
    strategy_type: 'grid_bot',
    symbol,
    action: 'HOLD',
    confidence: 0.5,
    reason: `Pris mellom grid-nivåer (spacing ${spacing.toFixed(0)})`,
    entry_price: price,
  };
}

/**
 * AI Copy: Mirrors the strongest BUY/SELL signal from other strategies
 */
export async function evaluateAICopy(symbol = 'BTCUSDT'): Promise<Signal> {
  const strategiesToMirror: StrategyType[] = [
    'dca_trygg',
    'trend_balansert',
    'multisignal_aktiv',
    'grid_bot',
  ];
  const signals: Signal[] = [];
  for (const st of strategiesToMirror) {
    try {
      const s = await evaluateStrategy(st, symbol);
      if (s && s.action !== 'HOLD') signals.push(s);
    } catch {
      // Ignore per-strategy errors
    }
  }

  if (signals.length === 0) {
    const price = await fetchPrice(symbol);
    return {
      strategy_type: 'ai_copy',
      symbol,
      action: 'HOLD',
      confidence: 0.5,
      reason: 'Ingen andre strategier ga BUY/SELL',
      entry_price: price,
    };
  }

  const strongest = signals.reduce((a, b) =>
    a.confidence >= b.confidence ? a : b
  );
  return {
    ...strongest,
    strategy_type: 'ai_copy',
    reason: `Kopierer ${strongest.strategy_type}: ${strongest.reason}`,
  };
}

// ── Strategy Dispatcher ─────────────────────────────────────────────────────

export const STRATEGY_EVALUATORS: Record<StrategyType, (symbol: string) => Promise<Signal>> = {
  dca_trygg: evaluateDCA,
  trend_balansert: evaluateTrend,
  multisignal_aktiv: evaluateMultiSignal,
  grid_bot: evaluateGridBot,
  ai_copy: evaluateAICopy,
};

export async function evaluateStrategy(
  strategyType: StrategyType,
  symbol = 'BTCUSDT',
  params?: Record<string, unknown>
): Promise<Signal | null> {
  if (strategyType === 'grid_bot' && params) {
    try {
      return await evaluateGridBot(symbol, params as GridBotParams);
    } catch (error) {
      console.error(`Feil ved evaluering av ${strategyType}:`, error);
      return null;
    }
  }

  const evaluator = STRATEGY_EVALUATORS[strategyType];
  if (!evaluator) {
    console.warn(`Ukjent strategi-type: ${strategyType}`);
    return null;
  }

  try {
    return await evaluator(symbol);
  } catch (error) {
    console.error(`Feil ved evaluering av ${strategyType}:`, error);
    return null;
  }
}

// ── NOK/USDT Konvertering ────────────────────────────────────────────────────

export async function fetchNOKRate(): Promise<number> {
  try {
    // Norges Bank API for USD/NOK kurs
    const res = await fetch(
      'https://data.norges-bank.no/api/data/EXR/B.USD.NOK.SP?format=sdmx-json&lastNObservations=1',
      { headers: { Accept: 'application/json' } }
    );
    
    if (!res.ok) throw new Error(`Norges Bank API feil: ${res.status}`);
    
    const data = await res.json();
    const rate = data?.dataSets?.[0]?.series?.['0:0:0:0']?.observations?.['0']?.[0];
    
    if (rate) return rate;
    
    // Fallback rate
    return 11.0;
  } catch (error) {
    console.error('Kunne ikke hente NOK kurs:', error);
    return 11.0; // Fallback
  }
}

export function convertNOKtoUSDT(nokAmount: number, nokRate: number): number {
  return nokAmount / nokRate;
}

export function convertUSDTtoNOK(usdtAmount: number, nokRate: number): number {
  return usdtAmount * nokRate;
}
