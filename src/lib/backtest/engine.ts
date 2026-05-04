/**
 * Backtest Engine - KLA-240
 * Simulerer trading strategier mot historiske data fra Binance
 *
 * BRUKER DE SAMME STRATEGIENE SOM TICK-ENGINE:
 * src/lib/trading/strategies/ — én kilde til sannhet
 */

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  side: 'LONG' | 'SHORT';
  size: number;
  pnl: number;
  pnlPct: number;
  fee: number;
}

export interface BacktestMetrics {
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  avgTradeDuration: number;
}

export interface BacktestResult {
  trades: Trade[];
  equityCurve: { timestamp: number; equity: number }[];
  metrics: BacktestMetrics;
  buyHoldReturn: number;
}

export type StrategyType = 'SMA_CROSSOVER' | 'RSI_MEAN_REVERSION' | 'AI_SIGNALS' | 'ENSEMBLE_AI' | 'DCA' | 'GRID' | 'MULTI_SIGNAL';

// Map backtest strategy types to shared strategy registry keys
const STRATEGY_KEY_MAP: Record<StrategyType, string> = {
  SMA_CROSSOVER: 'trend_follow',
  RSI_MEAN_REVERSION: 'multi_signal',
  AI_SIGNALS: 'multi_signal',
  ENSEMBLE_AI: 'multi_signal',
  DCA: 'dca',
  GRID: 'grid',
  MULTI_SIGNAL: 'multi_signal',
};

// Risk profile mapping for backtest strategies
export type RiskProfile = 'konservativ' | 'balansert' | 'aggressiv';

export interface StrategyConfig {
  symbol: string;
  smaFast: number;
  smaSlow: number;
  maxPositionPct: number;
  name: string;
}

export const STRATEGY_MAP: Record<RiskProfile, StrategyConfig> = {
  konservativ: {
    symbol: 'ETHUSDT',     // ETH = lavere volatilitet
    smaFast: 30,           // tregere signal = færre trades
    smaSlow: 100,
    maxPositionPct: 0.5,   // kun 50% av kapital per trade
    name: 'ETH SMA 30/100',
  },
  balansert: {
    symbol: 'BTCUSDT',
    smaFast: 20,
    smaSlow: 50,
    maxPositionPct: 0.75,  // 75% av kapital
    name: 'BTC SMA 20/50',
  },
  aggressiv: {
    symbol: 'BTCUSDT',
    smaFast: 10,           // raskere signal = flere trades
    smaSlow: 30,
    maxPositionPct: 1.0,   // full posisjon
    name: 'BTC SMA 10/30',
  },
};

// USD/NOK conversion rate (konservativt estimat)
const USDNOK_RATE = 10.5;

// Import shared strategies (same source as tick engine)
import {
  DCAStrategy,
  TrendFollowStrategy,
  MultiSignalStrategy,
  GridBotStrategy,
  type Candle,
  type StrategySignal,
  type MinimalSession,
  type StrategyInput,
} from '@/lib/trading/strategies';
import type { StrategyEngine } from '@/lib/trading/strategies';

export interface Methodology {
  title: string;
  howItWorks: string;
  whyItWorks: string;
  limitations: string[];
}

export interface EnhancedBacktestMetrics extends BacktestMetrics {
  buyHoldReturnPct: number;
  alpha: number;  // strategi - buyhold
  startValueNOK: number;
  endValueNOK: number;
}

export const STRATEGY_METHODOLOGY: Record<StrategyType, Methodology> = {
  SMA_CROSSOVER: {
    title: 'SMA Crossover — Trend-følging',
    howItWorks: 'Kjøper når kortsiktig glidende gjennomsnitt (f.eks. 20 dager) krysser over langsiktig (f.eks. 50 dager). Selger når det motsatte skjer. Følger markedstrenden.',
    whyItWorks: 'Når prisen stiger over gjennomsnittet, indikerer det at oppgangen har momentum. Strategien fanger store trender og unngår å kjøpe i fallende markeder.',
    limitations: [
      'Fungerer dårlig i svingende (sideways) markeder — gir mange falske signaler.',
      'Kommer sent inn i trenden og sent ut.',
      'Historisk avkastning er ingen garanti for fremtidig avkastning.',
    ],
  },
  RSI_MEAN_REVERSION: {
    title: 'RSI Mean Reversion — Mot-trend',
    howItWorks: 'Kjøper når RSI indikerer at markedet er oversolgt (<30). Selger når det er overkjøpt (>70). Satser på at prisen vender tilbake til gjennomsnittet.',
    whyItWorks: 'Etter store fall har prisen en tendens til å studse tilbake. RSI måler momentum — ekstreme verdier indikerer at bevegelsen er utmattet.',
    limitations: [
      'I sterke trender kan RSI forbli ekstremt lenge — strategien selger for tidlig i oppgang.',
      'Fungerer best i svingende markeder uten klar trend.',
      'Historisk avkastning er ingen garanti for fremtidig avkastning.',
    ],
  },
  AI_SIGNALS: {
    title: 'AI Signals — Kunstig intelligens',
    howItWorks: 'Bruker AI-genererte signaler fra markedsanalyse. Kombinerer tekniske indikatorer med sentiment-analyse for å ta beslutninger.',
    whyItWorks: 'AI kan prosessere enorme datamengder og oppdage mønstre mennesker ikke ser. Kan tilpasse seg skiftende markedsforhold raskere enn regelbaserte strategier.',
    limitations: [
      'AI-modeller trenes på historiske data og kan slite med nye markedsregimer.',
      'Krever kontinuerlig overvåking og re-trening.',
      'Historisk avkastning er ingen garanti for fremtidig avkastning.',
    ],
  },
  ENSEMBLE_AI: {
    title: 'Ensemble AI — Flere modeller',
    howItWorks: 'Kombinerer signaler fra flere AI-modeller og tekniske indikatorer. Bare når flertallet er enige, utføres en handel. Reduserer risikoen for falske signaler.',
    whyItWorks: 'Ingen enkelt modell er perfekt. Ved å kombinere mange modeller filtreres dårlige signaler ut, og kun de sterkeste signalene får gjennomslag.',
    limitations: [
      'Kan være for konservativ — mister noen gode muligheter.',
      'Krever tilgang til historiske AI-signaldata for backtest.',
      'Historisk avkastning er ingen garanti for fremtidig avkastning.',
    ],
  },
  DCA: {
    title: 'DCA — Dollar-Cost Averaging',
    howItWorks: 'Kjøper fast beløp med jevne mellomrom (f.eks. ukentlig). Når prisen faller mye, kjøper strategien mer (dip-scaling). Selger når gevinsten når 5% profit target, eller stopper tap ved -10%.',
    whyItWorks: 'Ved å kjøpe jevnlig utjevnes prissvingninger. Du kjøper mer når prisen er lav og mindre når den er høy — uten å måtte time markedet.',
    limitations: [
      'I stigende markeder gir DCA lavere avkastning enn å kjøpe alt på en gang.',
      'Krever disiplin — du må fortsette å kjøpe selv når markedet faller.',
      'Historisk avkastning er ingen garanti for fremtidig avkastning.',
    ],
  },
  GRID: {
    title: 'Grid Bot — Prisgitter',
    howItWorks: 'Setter opp et gitter av kjøps- og salgsnivåer rundt nåværende pris. Kjøper når prisen treffer et nedre nivå, selger når den treffer et øvre nivå. Tjener på svingninger.',
    whyItWorks: 'I svingende markeder (som krypto ofte er) studser prisen opp og ned. Grid-bot utnytter disse svingningene ved å kjøpe lavt og selge høyt automatisk.',
    limitations: [
      'Hvis prisen bryter kraftig ut av gitteret (sterk trend), tjener boten ingenting.',
      'Krever at markedet er i en trading range, ikke i sterk trend.',
      'Historisk avkastning er ingen garanti for fremtidig avkastning.',
    ],
  },
  MULTI_SIGNAL: {
    title: 'Multi-Signal — Flere indikatorer',
    howItWorks: 'Kombinerer RSI, MACD og pris-momentum. Kjøper bare når minst 2 av 3 indikatorer er enige. Dette reduserer falske signaler betydelig.',
    whyItWorks: 'En enkelt indikator kan gi falske signaler. Ved å kreve flere bekreftelser, filtreres ut svake signaler. Strategien fanger de sterkeste trendene.',
    limitations: [
      'Færre signaler = færre handler = kan gå glipp av noen muligheter.',
      'Fungerer best i markeder med klar trend, dårligere i kaotiske perioder.',
      'Historisk avkastning er ingen garanti for fremtidig avkastning.',
    ],
  },
};

const FEE_RATE = 0.001;

/**
 * Hent historiske OHLCV-data fra Binance med paginering.
 * Støtter opptil 4 år (1460 dager) ved å hente i bolker på 1000 lys.
 */
export async function fetchHistoricalData(
  symbol: string,
  interval: string,
  days: number = 365
): Promise<OHLCV[]> {
  const maxDays = Math.min(days, 1460); // Max 4 år
  const intervalMs = interval === '1d' ? 86400000 : interval === '4h' ? 14400000 : 3600000;
  const candlesPerChunk = 1000;
  const chunkMs = candlesPerChunk * intervalMs;
  
  const endTime = Date.now();
  const startTime = endTime - (maxDays * 86400000);
  
  const allCandles: OHLCV[] = [];
  let currentStart = startTime;
  
  while (currentStart < endTime) {
    const currentEnd = Math.min(currentStart + chunkMs, endTime);
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${Math.floor(currentStart)}&endTime=${Math.floor(currentEnd)}&limit=${candlesPerChunk}`;
    
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status} for ${symbol}`);
    }
    
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) break;
    
    const chunk = data.map((candle: unknown[]) => ({
      timestamp: candle[0] as number,
      open: parseFloat(candle[1] as string),
      high: parseFloat(candle[2] as string),
      low: parseFloat(candle[3] as string),
      close: parseFloat(candle[4] as string),
      volume: parseFloat(candle[5] as string),
    }));
    
    allCandles.push(...chunk);
    
    // Avanseér til neste chunk (siste candle + 1 interval)
    const lastTimestamp = chunk[chunk.length - 1].timestamp;
    currentStart = lastTimestamp + intervalMs;
    
    // Sikkerhetsbryter: maks 10 requests
    if (allCandles.length > 10000) break;
  }
  
  return allCandles;
}

function calculateSMA(data: OHLCV[], period: number): number[] {
  const closes = data.map((d) => d.close);
  const sma: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  
  return sma;
}

function calculateRSI(data: OHLCV[], period: number = 14): number[] {
  const closes = data.map((d) => d.close);
  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;
  
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      rsi.push(NaN);
      continue;
    }
    
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    
    if (i < period) {
      gains += gain;
      losses += loss;
      rsi.push(NaN);
    } else if (i === period) {
      gains = (gains + gain) / period;
      losses = (losses + loss) / period;
      rsi.push(losses === 0 ? 100 : 100 - 100 / (1 + gains / losses));
    } else {
      gains = (gains * (period - 1) + gain) / period;
      losses = (losses * (period - 1) + loss) / period;
      rsi.push(losses === 0 ? 100 : 100 - 100 / (1 + gains / losses));
    }
  }
  
  return rsi;
}

/**
 * Beregn MACD-linje og signal-linje
 */
function calculateMACD(closes: number[], fast = 12, slow = 26, signal = 9): { macd: number[]; signal: number[]; histogram: number[] } {
  const ema = (data: number[], period: number): number[] => {
    const k = 2 / (period + 1);
    const result: number[] = [data[0]];
    for (let i = 1; i < data.length; i++) {
      result.push(data[i] * k + result[i - 1] * (1 - k));
    }
    return result;
  };
  
  const fastEMA = ema(closes, fast);
  const slowEMA = ema(closes, slow);
  const macdLine = fastEMA.map((f, i) => f - slowEMA[i]);
  const signalLine = ema(macdLine, signal);
  const histogram = macdLine.map((m, i) => m - signalLine[i]);
  
  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Run backtest using shared strategies (same code as live tick engine).
 * This guarantees backtest results MATCH actual bot behavior.
 *
 * Improvements over v1:
 * - Uses shared strategy classes (src/lib/trading/strategies/)
 * - Simulates session state per candle (position tracking)
 * - Supports partial sells (DCA partial TP, trailing stops)
 * - Configurable fee model and slippage
 */
function runBacktestWithSharedStrategies(
  data: OHLCV[],
  strategyType: StrategyType,
  initialCapital: number,
  options?: {
    smaFast?: number;
    smaSlow?: number;
    maxPositionPct?: number;
    feeRate?: number;
    slippagePct?: number;
    strategyConfig?: Record<string, unknown>;
  }
): BacktestResult & { enhancedMetrics: EnhancedBacktestMetrics } {
  const maxPositionPct = options?.maxPositionPct ?? 1.0;
  const feeRate = options?.feeRate ?? 0.001;
  const slippagePct = options?.slippagePct ?? 0.05; // 0.05% slippage

  // Resolve strategy from shared registry
  const strategyKey = STRATEGY_KEY_MAP[strategyType];
  let strategy: StrategyEngine;

  switch (strategyKey) {
    case 'dca':
      strategy = new DCAStrategy();
      break;
    case 'trend_follow':
      strategy = new TrendFollowStrategy();
      break;
    case 'multi_signal':
      strategy = new MultiSignalStrategy();
      break;
    case 'grid':
      strategy = new GridBotStrategy();
      break;
    default:
      throw new Error(`Unknown strategy type: ${strategyType}`);
  }

  const strategyConfig: Record<string, unknown> = {
    ...options?.strategyConfig,
    fast_period: options?.smaFast ?? 20,
    slow_period: options?.smaSlow ?? 50,
  };

  const trades: Trade[] = [];
  const equityCurve: { timestamp: number; equity: number }[] = [];

  let capital = initialCapital;
  let position: { side: 'LONG'; entryPrice: number; size: number; entryTime: number; highestPrice: number } | null = null;
  let maxEquity = initialCapital;
  let maxDrawdown = 0;

  // Simulated session state
  const simulatedSession: MinimalSession = {
    open_position: null,
    last_tick_at: null,
    strategy_config: strategyConfig,
  };

  for (let i = 0; i < data.length; i++) {
    const candle = data[i];

    // Update session state with current position
    if (position) {
      simulatedSession.open_position = {
        side: 'long',
        quantity: position.size,
        entry_price: position.entryPrice,
        entry_time: new Date(position.entryTime).toISOString(),
        highest_price: position.highestPrice,
      };
    } else {
      simulatedSession.open_position = null;
    }

    // Build candle array up to current point (strategy sees history only)
    const candlesUpToNow: Candle[] = data.slice(0, i + 1).map((d) => ({
      time: d.timestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));

    // Evaluate strategy with backtest time override
    const signal = strategy.evaluate({
      candles: candlesUpToNow,
      session: simulatedSession,
      config: strategyConfig,
      currentTime: candle.timestamp,
    });

    const currentPrice = candle.close;
    const positionSize = signal.positionSize ?? 0.1;

    // Apply slippage: buy at higher price, sell at lower price
    const slippageFactor = 1 + slippagePct / 100;
    const executedPrice = signal.action === 'buy'
      ? currentPrice * slippageFactor
      : currentPrice / slippageFactor;

    if (signal.action === 'buy' && !position) {
      const positionCapital = capital * Math.min(positionSize, maxPositionPct);
      const fee = positionCapital * feeRate;
      const positionSizeQty = (positionCapital - fee) / executedPrice;

      position = {
        side: 'LONG',
        entryPrice: executedPrice,
        size: positionSizeQty,
        entryTime: candle.timestamp,
        highestPrice: executedPrice,
      };
      capital = capital - positionCapital;

      // Update last_tick_at for time-based strategies (DCA)
      simulatedSession.last_tick_at = new Date(candle.timestamp).toISOString();
    } else if (signal.action === 'sell' && position) {
      // Handle partial sells
      const sellFraction = Math.min(positionSize / (position.size * position.entryPrice / capital), 1);
      const qtyToSell = position.size * sellFraction;
      const exitValue = qtyToSell * executedPrice;
      const fee = exitValue * feeRate;
      const pnl = exitValue - fee - (qtyToSell * position.entryPrice);
      const pnlPct = (pnl / (qtyToSell * position.entryPrice)) * 100;

      trades.push({
        entryTime: position.entryTime,
        exitTime: candle.timestamp,
        entryPrice: position.entryPrice,
        exitPrice: executedPrice,
        side: position.side,
        size: qtyToSell,
        pnl,
        pnlPct,
        fee: qtyToSell * position.entryPrice * feeRate + fee,
      });

      capital = capital + exitValue - fee;
      position.size -= qtyToSell;

      if (position.size <= 0.0001) {
        position = null;
      }
    }

    // Update highest price for trailing stop
    if (position && currentPrice > position.highestPrice) {
      position.highestPrice = currentPrice;
    }

    const currentEquity = position
      ? capital + (position.size * currentPrice)
      : capital;

    equityCurve.push({ timestamp: candle.timestamp, equity: currentEquity });

    if (currentEquity > maxEquity) {
      maxEquity = currentEquity;
    }
    const drawdown = (maxEquity - currentEquity) / maxEquity;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // Close any remaining position at last price
  if (position && data.length > 0) {
    const lastCandle = data[data.length - 1];
    const exitValue = position.size * lastCandle.close;
    const fee = exitValue * feeRate;
    const pnl = exitValue - fee - (position.size * position.entryPrice);

    trades.push({
      entryTime: position.entryTime,
      exitTime: lastCandle.timestamp,
      entryPrice: position.entryPrice,
      exitPrice: lastCandle.close,
      side: position.side,
      size: position.size,
      pnl,
      pnlPct: (pnl / (position.size * position.entryPrice)) * 100,
      fee: position.size * position.entryPrice * feeRate + fee,
    });

    capital = capital + exitValue - fee;
  }

  return calculateMetrics(trades, equityCurve, capital, initialCapital, data);
}

export function generateSignalsFromLog(
  candles: OHLCV[],
  logSignals: { timestamp: string; decision_type: string; sentiment_score: number }[]
): ('BUY' | 'SELL' | 'HOLD')[] {
  const signals: ('BUY' | 'SELL' | 'HOLD')[] = [];
  const logMap = new Map<string, { action: 'BUY' | 'SELL' | 'HOLD'; confidence: number }>();

  for (const entry of logSignals) {
    const hourKey = new Date(entry.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const action = entry.decision_type.toUpperCase() as 'BUY' | 'SELL' | 'HOLD';
    if (['BUY', 'SELL', 'HOLD'].includes(action)) {
      logMap.set(hourKey, { action, confidence: entry.sentiment_score ?? 0 });
    }
  }

  for (const candle of candles) {
    const hourKey = new Date(candle.timestamp).toISOString().slice(0, 13);
    const entry = logMap.get(hourKey);
    // Only execute if confidence >= 80
    if (entry && entry.confidence >= 80) {
      signals.push(entry.action);
    } else {
      signals.push('HOLD');
    }
  }

  return signals;
}

/**
 * Calculate backtest metrics from trades and equity curve.
 * Shared helper used by both old and new backtest paths.
 */
function calculateMetrics(
  trades: Trade[],
  equityCurve: { timestamp: number; equity: number }[],
  finalEquity: number,
  initialCapital: number,
  candles: OHLCV[],
): BacktestResult & { enhancedMetrics: EnhancedBacktestMetrics } {
  const totalReturnPct = ((finalEquity - initialCapital) / initialCapital) * 100;

  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl <= 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

  const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;

  const bestTrade = trades.length > 0 ? Math.max(...trades.map((t) => t.pnlPct)) : 0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map((t) => t.pnlPct)) : 0;

  const avgTradeDuration = trades.length > 0
    ? trades.reduce((sum, t) => sum + (t.exitTime - t.entryTime) / (1000 * 60 * 60 * 24), 0) / trades.length
    : 0;

  // Calculate max drawdown from equity curve
  let maxEquity = initialCapital;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    if (point.equity > maxEquity) {
      maxEquity = point.equity;
    }
    const drawdown = (maxEquity - point.equity) / maxEquity;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  const returns = equityCurve.map((e, i) =>
    i === 0 ? 0 : (e.equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity
  );
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdReturn = Math.sqrt(
    returns.reduce((sq, n) => sq + Math.pow(n - avgReturn, 2), 0) / returns.length
  );
  const sharpeRatio = stdReturn === 0 ? 0 : (avgReturn / stdReturn) * Math.sqrt(365);

  const buyHoldReturn = candles.length > 0
    ? ((candles[candles.length - 1].close - candles[0].open) / candles[0].open) * 100
    : 0;

  const metrics: BacktestMetrics = {
    totalReturnPct,
    maxDrawdownPct: maxDrawdown * 100,
    sharpeRatio,
    winRate,
    totalTrades: trades.length,
    profitFactor,
    bestTrade,
    worstTrade,
    avgTradeDuration,
  };

  const startValueNOK = initialCapital * USDNOK_RATE;
  const endValueNOK = finalEquity * USDNOK_RATE;

  const enhancedMetrics: EnhancedBacktestMetrics = {
    ...metrics,
    buyHoldReturnPct: buyHoldReturn,
    alpha: totalReturnPct - buyHoldReturn,
    startValueNOK,
    endValueNOK,
  };

  return {
    trades,
    equityCurve,
    metrics,
    buyHoldReturn,
    enhancedMetrics,
  };
}

/**
 * Run backtest using shared strategies (same code as live tick engine).
 * This is the PRIMARY entry point for backtesting.
 */
export function runBacktest(
  candles: OHLCV[],
  strategy: StrategyType,
  initialCapital: number,
  options?: {
    smaFast?: number;
    smaSlow?: number;
    maxPositionPct?: number;
    feeRate?: number;
    slippagePct?: number;
    strategyConfig?: Record<string, unknown>;
  },
  externalSignals?: ('BUY' | 'SELL' | 'HOLD')[]
): BacktestResult & { enhancedMetrics: EnhancedBacktestMetrics } {
  // If external signals provided (legacy path), use old behavior
  if (externalSignals) {
    return runBacktestLegacy(candles, externalSignals, initialCapital, options);
  }
  // Use shared strategies (new path) — same code as live trading
  return runBacktestWithSharedStrategies(candles, strategy, initialCapital, options);
}

/**
 * Legacy backtest path for external signal arrays (AI logs, etc.)
 */
function runBacktestLegacy(
  candles: OHLCV[],
  signals: ('BUY' | 'SELL' | 'HOLD')[],
  initialCapital: number,
  options?: {
    maxPositionPct?: number;
    feeRate?: number;
  }
): BacktestResult & { enhancedMetrics: EnhancedBacktestMetrics } {
  const maxPositionPct = options?.maxPositionPct ?? 1.0;
  const feeRate = options?.feeRate ?? FEE_RATE;

  const trades: Trade[] = [];
  const equityCurve: { timestamp: number; equity: number }[] = [];

  let capital = initialCapital;
  let position: { side: 'LONG'; entryPrice: number; size: number; entryTime: number } | null = null;
  let maxEquity = initialCapital;
  let maxDrawdown = 0;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const signal = signals[i];

    if (!position && signal === 'BUY') {
      const positionCapital = capital * maxPositionPct;
      const fee = positionCapital * feeRate;
      const positionSize = positionCapital - fee;
      position = {
        side: 'LONG',
        entryPrice: candle.close,
        size: positionSize / candle.close,
        entryTime: candle.timestamp,
      };
      capital = capital - positionCapital;
    } else if (position && signal === 'SELL') {
      const exitValue = position.size * candle.close;
      const fee = exitValue * feeRate;
      const pnl = exitValue - fee - (position.size * position.entryPrice);
      const pnlPct = (pnl / (position.size * position.entryPrice)) * 100;

      trades.push({
        entryTime: position.entryTime,
        exitTime: candle.timestamp,
        entryPrice: position.entryPrice,
        exitPrice: candle.close,
        side: position.side,
        size: position.size,
        pnl,
        pnlPct,
        fee: position.size * position.entryPrice * feeRate + fee,
      });

      capital = exitValue - fee;
      position = null;
    }

    const currentEquity = position
      ? capital + (position.size * candle.close)
      : capital;

    equityCurve.push({ timestamp: candle.timestamp, equity: currentEquity });

    if (currentEquity > maxEquity) {
      maxEquity = currentEquity;
    }
    const drawdown = (maxEquity - currentEquity) / maxEquity;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  if (position && candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const exitValue = position.size * lastCandle.close;
    const fee = exitValue * feeRate;
    const pnl = exitValue - fee - (position.size * position.entryPrice);

    trades.push({
      entryTime: position.entryTime,
      exitTime: lastCandle.timestamp,
      entryPrice: position.entryPrice,
      exitPrice: lastCandle.close,
      side: position.side,
      size: position.size,
      pnl,
      pnlPct: (pnl / (position.size * position.entryPrice)) * 100,
      fee: position.size * position.entryPrice * feeRate + fee,
    });

    capital = exitValue - fee;
  }

  return calculateMetrics(trades, equityCurve, capital, initialCapital, candles);
}

// Helper function to run backtest with risk profile
export async function runBacktestWithProfile(
  riskProfile: RiskProfile,
  initialCapitalUSD: number,
  months: number
): Promise<BacktestResult & { enhancedMetrics: EnhancedBacktestMetrics; config: StrategyConfig }> {
  const config = STRATEGY_MAP[riskProfile];
  const limit = months <= 3 ? 90 : months <= 12 ? 365 : months <= 24 ? 730 : 1460;
  
  const candles = await fetchHistoricalData(config.symbol, '1d', limit);
  
  const result = runBacktest(candles, 'SMA_CROSSOVER', initialCapitalUSD, {
    smaFast: config.smaFast,
    smaSlow: config.smaSlow,
    maxPositionPct: config.maxPositionPct,
  });
  
  return { ...result, config };
}
