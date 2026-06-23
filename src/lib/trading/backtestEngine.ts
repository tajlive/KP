/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * KLARPAKKE BACKTEST ENGINE — Felles sannhetskilde for avkastningsberegning
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Denne modulen er én sannhetskilde (single source of truth) for:
 * - Landing page ROI-kalkulator
 * - Dashboard backtest-visning
 * - Paper trading simulering
 * - Live trading performance estimater
 * 
 * Bruker ekte historiske data fra Binance med realistiske fees og slippage.
 * 
 * @module lib/trading/backtestEngine
 */

import { calculateAllRiskMetrics, type RiskMetricsSummary } from "./risk-metrics";
import { runMonteCarlo, type MonteCarloResult } from "./monte-carlo";
import { runWalkForward, type WalkForwardResult } from "./walk-forward";
import { createBinanceMarketDataProvider } from "./canonical/market-data";
import { getUsdtToNokRate, getUsdtToNokRateAsync } from "./currency";

// ============================================================================
// TYPES
// ============================================================================

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestTrade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  side: 'LONG';
  size: number;
  pnl: number;
  pnlPct: number;
  fee: number;
}

export interface BacktestMetrics {
  /** Total avkastning i prosent (f.eks. 68 for 68%) */
  totalReturnPct: number;
  /** Maksimum drawdown i prosent (negativ verdi) */
  maxDrawdownPct: number;
  /** Sharpe ratio */
  sharpeRatio: number;
  /** Win rate i prosent */
  winRate: number;
  /** Antall trades */
  totalTrades: number;
  /** Profit factor (gross profit / gross loss) */
  profitFactor: number;
  /** Beste trade i prosent */
  bestTradePct: number;
  /** Verste trade i prosent */
  worstTradePct: number;
  /** Gjennomsnittlig holdetid i dager */
  avgTradeDurationDays: number;
  /** Volatilitet (annualisert) */
  volatility: number;
  /** Advanced risk metrics (opt-in) */
  riskMetrics?: RiskMetricsSummary;
}

export interface BacktestScenarios {
  /** Optimistisk scenario (80. percentil) */
  optimistic: number;
  /** Forventet scenario (median) */
  expected: number;
  /** Pessimistisk scenario (20. percentil) */
  pessimistic: number;
}

export interface BacktestResult {
  trades: BacktestTrade[];
  equityCurve: Array<{ timestamp: number; equity: number }>;
  metrics: BacktestMetrics;
  scenarios: BacktestScenarios;
  buyHoldReturn: number;
  /** Alpha: strategiens avkastning minus buy-and-hold */
  alpha: number;
  /** Startkapital i NOK */
  startValueNOK: number;
  /** Sluttverdi i NOK */
  endValueNOK: number;
  /** Valutakurs USD/NOK brukt */
  usdNokRate: number;
  /** Monte Carlo simulation (opt-in) */
  monteCarlo?: MonteCarloResult;
  /** Walk-forward analysis (opt-in) */
  walkForward?: WalkForwardResult;
}

export interface BacktestInput {
  /** Startkapital i NOK (f.eks. 100000) */
  initialCapitalNOK: number;
  /** Strategi-ID */
  strategyId: StrategyId;
  /** Periode i måneder (f.eks. 12) */
  months: number;
  /** USD/NOK kurs (valgfri, default fra getUsdtToNokRate) */
  usdNokRate?: number;
  /** Include Monte Carlo simulation (default false, adds ~1-2s) */
  includeMonteCarloSim?: boolean;
  /** Include walk-forward analysis (default false, adds ~2-5s) */
  includeWalkForward?: boolean;
}

export type RiskProfile = 'konservativ' | 'balansert' | 'aggressiv';
export type StrategyId = 'eth-dca' | 'btc-sma-20-50' | 'btc-sma-10-30';

export interface StrategyConfig {
  id: StrategyId;
  symbol: string;
  name: string;
  description: string;
  smaFast: number;
  smaSlow: number;
  maxPositionPct: number;
  feeRate: number;
}

// ============================================================================
// KONFIGURASJON
// ============================================================================

const DEFAULT_FEE_RATE = 0.001; // 0.1% Binance taker fee

export const STRATEGY_CONFIGS: Record<RiskProfile, StrategyConfig> = {
  konservativ: {
    id: 'eth-dca',
    symbol: 'ETHUSDT',
    name: 'ETH + DCA',
    description: 'Ethereum med dollar-cost averaging',
    smaFast: 30,
    smaSlow: 100,
    maxPositionPct: 0.5,
    feeRate: DEFAULT_FEE_RATE,
  },
  balansert: {
    id: 'btc-sma-20-50',
    symbol: 'BTCUSDT',
    name: 'BTC + SMA 20/50',
    description: 'Bitcoin med SMA crossover 20/50',
    smaFast: 20,
    smaSlow: 50,
    maxPositionPct: 0.75,
    feeRate: DEFAULT_FEE_RATE,
  },
  aggressiv: {
    id: 'btc-sma-10-30',
    symbol: 'BTCUSDT',
    name: 'BTC + SMA 10/30',
    description: 'Bitcoin med SMA crossover 10/30',
    smaFast: 10,
    smaSlow: 30,
    maxPositionPct: 1.0,
    feeRate: DEFAULT_FEE_RATE,
  },
};

// Mapping fra gammel strategi-ID til risk profile
export function strategyIdToRiskProfile(strategyId: StrategyId): RiskProfile {
  switch (strategyId) {
    case 'eth-dca': return 'konservativ';
    case 'btc-sma-20-50': return 'balansert';
    case 'btc-sma-10-30': return 'aggressiv';
    default: return 'balansert';
  }
}

// ============================================================================
// HJELPEFUNKSJONER
// ============================================================================

function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

function calculateVolatility(returns: number[]): number {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(365); // Annualisert
}

// ============================================================================
// HENTE HISTORISKE DATA
// ============================================================================

const marketDataProvider = createBinanceMarketDataProvider();

/**
 * Hent historiske OHLCV-data fra Binance
 */
export async function fetchHistoricalData(
  symbol: string,
  days: number
): Promise<OHLCV[]> {
  const limit = Math.min(days, 1095); // Max 3 år
  const klines = await marketDataProvider.getKlines(symbol, "1d", limit);

  return klines.map((candle) => ({
    timestamp: candle.timestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  }));
}

// ============================================================================
// BACKTEST-LOGIKK
// ============================================================================

/**
 * Kjør backtest med SMA crossover strategi
 */
export function runBacktest(
  candles: OHLCV[],
  config: StrategyConfig,
  initialCapitalUSD: number
): Omit<BacktestResult, 'startValueNOK' | 'endValueNOK' | 'usdNokRate' | 'alpha'> {
  const closes = candles.map(d => d.close);
  const smaFast = calculateSMA(closes, config.smaFast);
  const smaSlow = calculateSMA(closes, config.smaSlow);
  
  const trades: BacktestTrade[] = [];
  const equityCurve: Array<{ timestamp: number; equity: number }> = [];
  
  let capital = initialCapitalUSD;
  let maxEquity = initialCapitalUSD;
  let maxDrawdown = 0;
  let position: { entryPrice: number; size: number; entryTime: number } | null = null;
  
  // Start fra der begge SMA-er er tilgjengelige
  const startIndex = config.smaSlow;
  
  for (let i = startIndex; i < candles.length; i++) {
    const candle = candles[i];
    const prevFast = smaFast[i - 1];
    const prevSlow = smaSlow[i - 1];
    const currFast = smaFast[i];
    const currSlow = smaSlow[i];
    
    // Golden cross - kjøp
    if (!position && prevFast <= prevSlow && currFast > currSlow) {
      const positionCapital = capital * config.maxPositionPct;
      const fee = positionCapital * config.feeRate;
      const positionSize = (positionCapital - fee) / candle.close;
      
      position = {
        entryPrice: candle.close,
        size: positionSize,
        entryTime: candle.timestamp,
      };
      capital = capital - positionCapital;
    }
    
    // Death cross - selg
    else if (position && prevFast >= prevSlow && currFast < currSlow) {
      const exitValue = position.size * candle.close;
      const fee = exitValue * config.feeRate;
      const pnl = exitValue - fee - (position.size * position.entryPrice);
      const pnlPct = (pnl / (position.size * position.entryPrice)) * 100;
      
      trades.push({
        entryTime: position.entryTime,
        exitTime: candle.timestamp,
        entryPrice: position.entryPrice,
        exitPrice: candle.close,
        side: 'LONG',
        size: position.size,
        pnl,
        pnlPct,
        fee: position.size * position.entryPrice * config.feeRate + fee,
      });
      
      capital = exitValue - fee;
      position = null;
    }
    
    // Beregn daglig equity
    const currentEquity = position 
      ? capital + (position.size * candle.close)
      : capital;
    
    equityCurve.push({ timestamp: candle.timestamp, equity: currentEquity });
    
    // Track drawdown
    if (currentEquity > maxEquity) {
      maxEquity = currentEquity;
    }
    const drawdown = (maxEquity - currentEquity) / maxEquity;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  // Lukk åpen posisjon ved slutten
  if (position && candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const exitValue = position.size * lastCandle.close;
    const fee = exitValue * config.feeRate;
    const pnl = exitValue - fee - (position.size * position.entryPrice);
    
    trades.push({
      entryTime: position.entryTime,
      exitTime: lastCandle.timestamp,
      entryPrice: position.entryPrice,
      exitPrice: lastCandle.close,
      side: 'LONG',
      size: position.size,
      pnl,
      pnlPct: (pnl / (position.size * position.entryPrice)) * 100,
      fee: position.size * position.entryPrice * config.feeRate + fee,
    });
    
    capital = exitValue - fee;
  }
  
  // Beregn metrics
  const finalEquity = capital;
  const totalReturnPct = ((finalEquity - initialCapitalUSD) / initialCapitalUSD) * 100;
  const buyHoldReturn = ((closes[closes.length - 1] - closes[startIndex]) / closes[startIndex]) * 100;
  
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl <= 0);
  
  const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  
  // Beregn daglige returns for Sharpe og volatilitet
  const dailyReturns = equityCurve.map((e, i) => 
    i === 0 ? 0 : (e.equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity
  ).slice(1);
  
  const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const stdReturn = Math.sqrt(
    dailyReturns.reduce((sq, n) => sq + Math.pow(n - avgReturn, 2), 0) / dailyReturns.length
  );
  
  // Sharpe ratio (antar 3% risk-free rate)
  const riskFreeRateDaily = 0.03 / 365;
  const sharpeRatio = stdReturn === 0 ? 0 : 
    ((avgReturn - riskFreeRateDaily) / stdReturn) * Math.sqrt(365);
  
  // Beregn scenarier basert på faktisk volatilitet
  // Optimistisk = bedre avkastning (mindre negativ eller mer positiv)
  // Pessimistisk = dårligere avkastning (mer negativ eller mindre positiv)
  const volatility = calculateVolatility(dailyReturns);
  const volAdjustment = volatility * 0.5;
  
  const scenarios: BacktestScenarios = {
    optimistic: totalReturnPct + volAdjustment * 100, // Bedre resultat
    expected: totalReturnPct,
    pessimistic: totalReturnPct - volAdjustment * 100, // Dårligere resultat
  };
  
  const metrics: BacktestMetrics = {
    totalReturnPct,
    maxDrawdownPct: -maxDrawdown * 100,
    sharpeRatio,
    winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
    totalTrades: trades.length,
    profitFactor: totalLoss === 0 ? (totalProfit > 0 ? Infinity : 0) : totalProfit / totalLoss,
    bestTradePct: trades.length > 0 ? Math.max(...trades.map(t => t.pnlPct)) : 0,
    worstTradePct: trades.length > 0 ? Math.min(...trades.map(t => t.pnlPct)) : 0,
    avgTradeDurationDays: trades.length > 0
      ? trades.reduce((sum, t) => sum + (t.exitTime - t.entryTime) / (1000 * 60 * 60 * 24), 0) / trades.length
      : 0,
    volatility: volatility * 100,
    // Advanced risk metrics
    riskMetrics: dailyReturns.length >= 2
      ? calculateAllRiskMetrics(
          dailyReturns,
          trades,
          equityCurve.map(e => e.equity),
          totalReturnPct / 100,
          maxDrawdown,
        )
      : undefined,
  };
  
  return {
    trades,
    equityCurve,
    metrics,
    scenarios,
    buyHoldReturn,
  };
}

// ============================================================================
// HOVEDFUNKSJON
// ============================================================================

/**
 * Kjør komplett backtest med input-parametere.
 * 
 * Henter historiske OHLCV-data fra Binance, simulerer trading med SMA-crossover
 * strategi, og returnerer detaljerte metrics inkludert scenarier og fees.
 * 
 * @param input - Input-parametere for backtest
 * @param input.initialCapitalNOK - Startkapital i NOK (f.eks. 100000)
 * @param input.strategyId - Strategi-ID: 'eth-dca' | 'btc-sma-20-50' | 'btc-sma-10-30'
 * @param input.months - Periode i måneder (f.eks. 12)
 * @param input.usdNokRate - USD/NOK kurs (valgfri, default fra getUsdtToNokRate)
 * 
 * @returns Fullstendig backtest-resultat med trades, equity curve og metrics
 * 
 * @throws Error hvis Binance API feiler eller strategi ikke finnes
 * 
 * @example
 * ```typescript
 * const result = await calculateBacktest({
 *   initialCapitalNOK: 100000,
 *   strategyId: 'btc-sma-20-50',
 *   months: 12,
 * });
 * 
 * console.log(result.metrics.totalReturnPct); // +45.2
 * console.log(result.scenarios.expected);     // Forventet avkastning
 * ```
 * 
 * @remarks
 * - Bruker 0.1% trading fees (Binance taker fee)
 * - Maks 3 år historiske data (1095 dager)
 * - SMA-beregning starter etter smaSlow perioder
 * - Scenarier beregnes basert på faktisk volatilitet
 */
export async function calculateBacktest(input: BacktestInput): Promise<BacktestResult> {
  const usdNokRate = input.usdNokRate ?? getUsdtToNokRate();
  const { initialCapitalNOK, strategyId, months } = input;
  
  // Finn config
  const riskProfile = strategyIdToRiskProfile(strategyId);
  const config = STRATEGY_CONFIGS[riskProfile];
  
  // Konverter til USD
  const initialCapitalUSD = initialCapitalNOK / usdNokRate;
  
  // Hent historiske data
  const days = months * 30;
  const candles = await fetchHistoricalData(config.symbol, days);
  
  // Kjør backtest
  const backtest = runBacktest(candles, config, initialCapitalUSD);
  
  // Run Monte Carlo simulation if requested
  let monteCarlo: MonteCarloResult | undefined;
  if (input.includeMonteCarloSim && backtest.trades.length >= 3) {
    monteCarlo = runMonteCarlo(backtest.trades, {
      simulations: 10_000,
      initialCapital: initialCapitalUSD,
      ruinThresholdPct: 0.5,
    });
  }

  // Run walk-forward analysis if requested
  let walkForward: WalkForwardResult | undefined;
  if (input.includeWalkForward && candles.length >= 300) {
    walkForward = runWalkForward(candles, config, initialCapitalUSD, {
      numWindows: 5,
      inSamplePct: 0.7,
      minCandlesPerWindow: 60,
    });
  }
  
  // Beregn NOK-verdier
  const endValueNOK = (initialCapitalUSD * (1 + backtest.metrics.totalReturnPct / 100)) * usdNokRate;
  
  return {
    ...backtest,
    startValueNOK: initialCapitalNOK,
    endValueNOK,
    usdNokRate,
    alpha: backtest.metrics.totalReturnPct - backtest.buyHoldReturn,
    monteCarlo,
    walkForward,
  };
}

/**
 * Hurtig backtest med risk profile (brukes fra landing page).
 * 
 * Convenience-funksjon som mapper risk profile til riktig strategi og
 * kaller {@link calculateBacktest}. Brukes primært av landingssiden
 * der brukeren velger "Konservativ"/"Balansert"/"Aggressiv".
 * 
 * @param riskProfile - Risikoprofil: 'konservativ' | 'balansert' | 'aggressiv'
 * @param initialCapitalNOK - Startkapital i NOK (f.eks. 100000)
 * @param months - Periode i måneder (f.eks. 12)
 * 
 * @returns Fullstendig backtest-resultat
 * 
 * @throws Error hvis Binance API feiler
 * 
 * @example
 * ```typescript
 * // Landingssiden kaller:
 * const result = await calculateBacktestWithProfile('balansert', 100000, 12);
 * // Samme som:
 * // calculateBacktest({ strategyId: 'btc-sma-20-50', ... })
 * ```
 * 
 * @see {@link calculateBacktest} for detaljert dokumentasjon
 * @see {@link STRATEGY_CONFIGS} for mapping mellom profil og strategi
 */
export async function calculateBacktestWithProfile(
  riskProfile: RiskProfile,
  initialCapitalNOK: number,
  months: number
): Promise<BacktestResult> {
  const config = STRATEGY_CONFIGS[riskProfile];
  return calculateBacktest({
    initialCapitalNOK,
    strategyId: config.id,
    months,
  });
}

// ============================================================================
// FORMatering
// ============================================================================

export interface FormattedBacktestResult {
  scenarios: {
    optimistic: string;
    expected: string;
    pessimistic: string;
    optimisticReturn: string;
    expectedReturn: string;
    pessimisticReturn: string;
  };
  metrics: {
    totalReturn: string;
    maxDrawdown: string;
    volatility: string;
    winRate: string;
    totalTrades: string;
    sharpeRatio: string;
  };
  values: {
    startValue: string;
    endValue: string;
    alpha: string;
  };
}

/**
 * Formaterer backtest-resultat for visning.
 * 
 * Konverterer numeriske verdier til lokaliserte strenger formatert
 * for norsk (NOK) eller annet locale. Brukes for å vise tall i UI.
 * 
 * @param result - Rått backtest-resultat fra {@link calculateBacktest}
 * @param locale - Locale for formatering (default 'no-NO')
 * @returns Formaterte strenger klare for visning i komponenter
 * 
 * @example
 * ```typescript
 * const result = await calculateBacktest({
 *   initialCapitalNOK: 100000,
 *   strategyId: 'btc-sma-20-50',
 *   months: 12,
 * });
 * 
 * const formatted = formatBacktestResult(result);
 * 
 * // Bruk i JSX:
 * // <span>{formatted.scenarios.expected}</span>  // "kr 145 200"
 * // <span>{formatted.metrics.totalReturn}</span> // "+45.2%"
 * // <span>{formatted.metrics.maxDrawdown}</span> // "-12.5%"
 * ```
 * 
 * @see {@link FormattedBacktestResult} for struktur på returverdi
 */
export function formatBacktestResult(
  result: BacktestResult,
  locale: string = 'no-NO'
): FormattedBacktestResult {
  const formatNOK = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'NOK',
      maximumFractionDigits: 0,
    }).format(value);
  
  const formatPct = (value: number) =>
    `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  
  return {
    scenarios: {
      optimistic: formatNOK(result.startValueNOK * (1 + result.scenarios.optimistic / 100)),
      expected: formatNOK(result.startValueNOK * (1 + result.scenarios.expected / 100)),
      pessimistic: formatNOK(result.startValueNOK * (1 + result.scenarios.pessimistic / 100)),
      optimisticReturn: formatPct(result.scenarios.optimistic),
      expectedReturn: formatPct(result.scenarios.expected),
      pessimisticReturn: formatPct(result.scenarios.pessimistic),
    },
    metrics: {
      totalReturn: formatPct(result.metrics.totalReturnPct),
      maxDrawdown: formatPct(result.metrics.maxDrawdownPct),
      volatility: formatPct(result.metrics.volatility),
      winRate: `${result.metrics.winRate.toFixed(0)}%`,
      totalTrades: result.metrics.totalTrades.toString(),
      sharpeRatio: result.metrics.sharpeRatio.toFixed(2),
    },
    values: {
      startValue: formatNOK(result.startValueNOK),
      endValue: formatNOK(result.endValueNOK),
      alpha: formatPct(result.alpha),
    },
  };
}

// ============================================================================
// CACHING
// ============================================================================

import { createClient } from '@supabase/supabase-js';

/** Cache entry struktur */
interface CacheEntry {
  id: string;
  symbol: string;
  strategy_id: string;
  period_months: number;
  result_data: BacktestResult;
  metrics_summary: {
    cagr: number;
    max_drawdown: number;
    win_rate: number;
    total_trades: number;
    volatility: number;
  };
  expires_at: string;
  created_at: string;
}

/** Cache klient for backtest-resultater */
class BacktestCache {
  private supabase: ReturnType<typeof createClient> | null = null;
  private memoryCache: Map<string, { data: BacktestResult; expires: number }> = new Map();
  
  constructor() {
    // Initialiser Supabase client kun på server
    if (typeof window === 'undefined') {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && key) {
        this.supabase = createClient(url, key);
      }
    }
  }
  
  /** Generer cache-nøkkel */
  private getCacheKey(symbol: string, strategyId: string, months: number): string {
    return `${symbol}:${strategyId}:${months}`;
  }
  
  /** Sjekk minne-cache først */
  private getFromMemory(key: string): BacktestResult | null {
    const entry = this.memoryCache.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.data;
    }
    this.memoryCache.delete(key);
    return null;
  }
  
  /** Lagre i minne-cache */
  private setInMemory(key: string, data: BacktestResult, ttlHours: number = 1): void {
    this.memoryCache.set(key, {
      data,
      expires: Date.now() + ttlHours * 60 * 60 * 1000,
    });
  }
  
  /**
   * Hent fra cache eller returner null
   */
  async get(symbol: string, strategyId: string, months: number): Promise<BacktestResult | null> {
    const key = this.getCacheKey(symbol, strategyId, months);
    
    // Sjekk minne-cache først
    const memoryResult = this.getFromMemory(key);
    if (memoryResult) {
      return memoryResult;
    }
    
    // Sjekk database-cache (server-side only)
    if (!this.supabase) return null;
    
    try {
      const { data, error } = await this.supabase
        .from('backtest_cache')
        .select('result_data, expires_at')
        .eq('symbol', symbol)
        .eq('strategy_id', strategyId)
        .eq('period_months', months)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (error || !data) return null;
      
      // Lagre i minne-cache for neste gang
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (data as any).result_data as BacktestResult;
      this.setInMemory(key, result);
      return result;
    } catch {
      return null;
    }
  }
  
  /**
   * Lagre i cache
   */
  async set(
    symbol: string, 
    strategyId: string, 
    months: number, 
    result: BacktestResult
  ): Promise<void> {
    const key = this.getCacheKey(symbol, strategyId, months);
    
    // Alltid lagre i minne-cache
    this.setInMemory(key, result);
    
    // Lagre i database (server-side only, fire-and-forget)
    if (!this.supabase) return;
    
    try {
      const metricsSummary = {
        cagr: result.metrics.totalReturnPct,
        max_drawdown: result.metrics.maxDrawdownPct,
        win_rate: result.metrics.winRate,
        total_trades: result.metrics.totalTrades,
        volatility: result.metrics.volatility,
      };
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.supabase.from('backtest_cache') as any).upsert({
        symbol,
        strategy_id: strategyId,
        period_months: months,
        result_hash: `${Date.now()}`, // Simpel hash
        result_data: result,
        metrics_summary: metricsSummary,
        usd_nok_rate: result.usdNokRate,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }, {
        onConflict: 'symbol,strategy_id,period_months',
      });
    } catch {
      // Ignorer cache-skrivefeil - ikke kritisk
    }
  }
  
  /** Tøm minne-cache (brukes i tester) */
  clearMemory(): void {
    this.memoryCache.clear();
  }
}

// Singleton cache instans
const backtestCache = new BacktestCache();

// ============================================================================
// TELEMETRI
// ============================================================================

/** Telemetri data for logging */
interface BacktestTelemetryData {
  sessionId: string;
  strategyId: string;
  periodMonths: number;
  initialCapitalNOK: number;
  metrics: {
    cagr: number;
    maxDrawdown: number;
    winRate: number;
    totalTrades: number;
    volatility: number;
  };
  cacheHit: boolean;
  cacheAgeMs?: number;
}

/** Generer anonym session ID */
function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/** Hent eller opprett session ID */
function getSessionId(): string {
  if (typeof document === 'undefined') return generateSessionId();
  
  try {
    const existing = document.cookie.match(/backtest_session=([^;]+)/)?.[1];
    if (existing) return existing;
    
    const newId = generateSessionId();
    document.cookie = `backtest_session=${newId};path=/;max-age=86400;SameSite=Lax`;
    return newId;
  } catch {
    return generateSessionId();
  }
}

/**
 * Logg backtest-bruk til telemetri
 * Fire-and-forget: blokkerer ikke kalkuleringen
 */
function logBacktestTelemetry(data: BacktestTelemetryData): void {
  // Kjør async uten å vente
  setTimeout(async () => {
    try {
      // I browser: send til API
      if (typeof window !== 'undefined') {
        await fetch('/api/telemetry/backtest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).catch(() => {}); // Ignorer nettverksfeil
      }
    } catch {
      // Ignorer telemetri-feil - ikke kritisk
    }
  }, 0);
}

/**
 * Marker at bruker konverterte til paper trading
 */
export async function markBacktestConverted(sessionId?: string): Promise<void> {
  const sid = sessionId || getSessionId();
  
  try {
    if (typeof window !== 'undefined') {
      await fetch('/api/telemetry/backtest/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
      }).catch(() => {});
    }
  } catch {
    // Ignorer
  }
}

// ============================================================================
// OPTIMALISERT BACKTEST MED CACHE
// ============================================================================

export interface BacktestWithCacheResult extends BacktestResult {
  /** Indikerer om resultatet kom fra cache */
  fromCache: boolean;
  /** Session ID for telemetri */
  sessionId: string;
}

/**
 * Kjør backtest med caching og telemetri.
 * 
 * Denne funksjonen:
 * 1. Sjekker cache først (minne -> database)
 * 2. Ved cache miss: kjører full backtest og lagrer i cache
 * 3. Logger anonym telemetri for analyse
 * 
 * @param input - Input-parametere for backtest
 * @param options - Valgfrie innstillinger
 * @returns Backtest-resultat med cache-status
 * 
 * @example
 * ```typescript
 * const result = await calculateBacktestWithCache({
 *   initialCapitalNOK: 100000,
 *   strategyId: 'btc-sma-20-50',
 *   months: 12,
 * });
 * 
 * console.log(result.fromCache); // true hvis cache hit
 * ```
 */
export async function calculateBacktestWithCache(
  input: BacktestInput,
  options?: { skipCache?: boolean; skipTelemetry?: boolean }
): Promise<BacktestWithCacheResult> {
  const usdNokRate = input.usdNokRate ?? await getUsdtToNokRateAsync();
  const { initialCapitalNOK, strategyId, months } = input;
  const sessionId = getSessionId();
  const startTime = Date.now();
  
  // Finn config
  const riskProfile = strategyIdToRiskProfile(strategyId);
  const config = STRATEGY_CONFIGS[riskProfile];
  
  // Sjekk cache hvis ikke skipCache
  if (!options?.skipCache) {
    const cached = await backtestCache.get(config.symbol, strategyId, months);
    if (cached) {
      // Juster for kapital (cache er for 100k NOK default)
      const adjusted = adjustResultForCapital(cached, initialCapitalNOK);
      
      // Logg telemetri
      if (!options?.skipTelemetry) {
        logBacktestTelemetry({
          sessionId,
          strategyId,
          periodMonths: months,
          initialCapitalNOK,
          metrics: {
            cagr: adjusted.metrics.totalReturnPct,
            maxDrawdown: adjusted.metrics.maxDrawdownPct,
            winRate: adjusted.metrics.winRate,
            totalTrades: adjusted.metrics.totalTrades,
            volatility: adjusted.metrics.volatility,
          },
          cacheHit: true,
          cacheAgeMs: Date.now() - startTime,
        });
      }
      
      return {
        ...adjusted,
        fromCache: true,
        sessionId,
      };
    }
  }
  
  // Ingen cache - kjør full backtest
  const result = await calculateBacktest({ ...input, usdNokRate });
  
  // Lagre i cache (fire-and-forget)
  backtestCache.set(config.symbol, strategyId, months, result).catch(() => {});
  
  // Logg telemetri
  if (!options?.skipTelemetry) {
    logBacktestTelemetry({
      sessionId,
      strategyId,
      periodMonths: months,
      initialCapitalNOK,
      metrics: {
        cagr: result.metrics.totalReturnPct,
        maxDrawdown: result.metrics.maxDrawdownPct,
        winRate: result.metrics.winRate,
        totalTrades: result.metrics.totalTrades,
        volatility: result.metrics.volatility,
      },
      cacheHit: false,
      cacheAgeMs: Date.now() - startTime,
    });
  }
  
  return {
    ...result,
    fromCache: false,
    sessionId,
  };
}

/**
 * Juster cachet resultat for forskjellig kapital.
 * Metrics (%, win rate, etc) er uavhengig av kapital, men NOK-verdier må justeres.
 */
function adjustResultForCapital(
  cached: BacktestResult, 
  newCapitalNOK: number
): BacktestResult {
  const ratio = newCapitalNOK / cached.startValueNOK;
  
  return {
    ...cached,
    startValueNOK: newCapitalNOK,
    endValueNOK: cached.endValueNOK * ratio,
    // Behalf trades, metrics, scenarios (%) uendret
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const BacktestEngine = {
  calculateBacktest,
  calculateBacktestWithProfile,
  calculateBacktestWithCache,
  formatBacktestResult,
  fetchHistoricalData,
  runBacktest,
  markBacktestConverted,
  clearCache: () => backtestCache.clearMemory(),
  STRATEGY_CONFIGS,
};

export default BacktestEngine;
