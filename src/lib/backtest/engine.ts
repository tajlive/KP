/**
 * Backtest Engine - KLA-240
 * Simulerer trading strategier mot historiske data fra Binance
 *
 * BRUKER DE SAMME STRATEGIENE SOM TICK-ENGINE:
 * src/lib/trading/strategies/ — én kilde til sannhet
 *
 * C4 backtest-parity (Tasks 3–6):
 * - Kanonisk fill-modell (computeFill) med realistiske fees/slippage.
 * - Lot-size-avrunding via roundToLotSize.
 * - FIFO position-ledger for kostnadsbasis og realisert P&L.
 * - Kanoniske risikogrenser via resolveRiskLimits før kjøp.
 * - Legacy ekstern-signal-sti bruker samme fill/FIFO/avrunding der det er mulig.
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
import { createBinanceMarketDataProvider } from '@/lib/trading/canonical/market-data';
import { getUsdtToNokRate } from '@/lib/trading/currency';
import { computeFill } from '@/lib/trading/canonical/execution/fill-model';
import { FILL_CONSTANTS } from '@/lib/trading/canonical/execution/fill-constants';
import { roundToLotSize } from '@/lib/trading/canonical/symbols/lot-sizes';
import {
  createLedger,
  addLot,
  sellFIFO,
  getTotalQuantity,
  getWeightedEntryPrice,
  isEmpty,
  type LedgerState,
} from '@/lib/trading/position-ledger';
import {
  calculatePnlFromTrades,
  type TradePnlInput,
} from '@/lib/trading/canonical/pnl/trade-pnl';
import {
  resolveRiskLimits,
  type RawRiskProfile,
} from '@/lib/trading/canonical/risk/limits-resolver';

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

// Kanoniske backtest-parametere — fra canonical FILL_CONSTANTS
const FEE_RATE = FILL_CONSTANTS.feeRate;
const MARKET_SLIPPAGE_RATE = FILL_CONSTANTS.marketSlippageRate;
const MIN_ORDER_VALUE_USDT = FILL_CONSTANTS.minOrderValue;

const marketDataProvider = createBinanceMarketDataProvider();

interface RunBacktestOptions {
  smaFast?: number;
  smaSlow?: number;
  maxPositionPct?: number;
  feeRate?: number;
  slippagePct?: number;
  strategyConfig?: Record<string, unknown>;
  /** Handelssymbol for lot-size-avrunding og risikogrenser. */
  symbol?: string;
  /** Risikoprofil for kanoniske risikogrenser. */
  riskProfile?: RiskProfile;
}

/**
 * Bygg en RawRiskProfile som gjenspeiler kanoniske grenser fra valgt profil,
 * eller fallback til options.maxPositionPct hvis profil ikke er oppgitt.
 */
function buildRawRiskProfile(
  options: RunBacktestOptions | undefined,
  strategyType: StrategyType,
  symbol: string,
): RawRiskProfile {
  const maxPositionPct = options?.riskProfile
    ? STRATEGY_MAP[options.riskProfile].maxPositionPct
    : (options?.maxPositionPct ?? 1.0);

  return {
    id: `backtest-${options?.riskProfile ?? strategyType}`,
    name: `Backtest ${options?.riskProfile ?? strategyType}`,
    max_position_pct: maxPositionPct * 100,
    max_exposure_pct: maxPositionPct * 100,
    max_daily_loss_pct: 100,
    allowed_pairs: [symbol],
    leverage_allowed: false,
  };
}

/**
 * Hent historiske OHLCV-data fra Binance via kanonisk markedsdata-provider.
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
    const klines = await marketDataProvider.getKlines(
      symbol,
      interval,
      candlesPerChunk,
      currentStart,
      currentEnd,
    );

    if (!Array.isArray(klines) || klines.length === 0) break;

    const chunk = klines.map((candle) => ({
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    }));

    allCandles.push(...chunk);

    // Avanseér til neste chunk (siste candle + 1 interval)
    const lastTimestamp = chunk[chunk.length - 1].timestamp;
    currentStart = lastTimestamp + intervalMs;

    // Sikkerhetsbryter: maks 10 000 lys
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

interface BacktestPosition {
  entryTime: number;
  highestPrice: number;
  partialExitsExecuted: number[];
  dailyBuysToday: string;
  dailyBuyCount: number;
}

/**
 * Run backtest using shared strategies (same code as live tick engine).
 * This guarantees backtest results MATCH actual bot behavior.
 *
 * C4 parity-oppgraderinger:
 * - Kanonisk fill-modell (computeFill) med fees/slippage.
 * - Lot-size-avrunding.
 * - FIFO position-ledger for kostnadsbasis og realisert P&L.
 * - Kanoniske risikogrenser (resolveRiskLimits) før kjøp.
 */
function runBacktestWithSharedStrategies(
  data: OHLCV[],
  strategyType: StrategyType,
  initialCapital: number,
  options?: RunBacktestOptions,
): BacktestResult & { enhancedMetrics: EnhancedBacktestMetrics } {
  const symbol = options?.symbol ?? 'BTCUSDT';
  const maxPositionPct = options?.maxPositionPct ?? 1.0;
  const feeRate = options?.feeRate ?? FEE_RATE;
  // options.slippagePct er i prosent (default 0.2 => 0.002 rate)
  const marketSlippageRate = (options?.slippagePct ?? 0.2) / 100;

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

  // Kanoniske risikogrenser (samme som live/paper)
  const rawProfile = buildRawRiskProfile(options, strategyType, symbol);
  const limits = resolveRiskLimits('paper', rawProfile);
  if (!limits) {
    throw new Error(`Could not resolve risk limits for backtest strategy "${strategyType}"`);
  }

  const trades: Trade[] = [];
  const equityCurve: { timestamp: number; equity: number }[] = [];
  const tradePnlInputs: TradePnlInput[] = [];

  let cashUSD = initialCapital;
  let maxEquity = initialCapital;
  let maxDrawdown = 0;
  let ledger: LedgerState = createLedger('long');
  let position: BacktestPosition | null = null;

  // Simulated session state
  const simulatedSession: MinimalSession = {
    open_position: null,
    last_tick_at: null,
    strategy_config: {},
  };

  for (let i = 0; i < data.length; i++) {
    const candle = data[i];
    const positionQty = getTotalQuantity(ledger);
    const positionEntryPrice = getWeightedEntryPrice(ledger);

    // Update session state with current position
    simulatedSession.open_position = position && positionQty > 0
      ? {
          side: 'long',
          quantity: positionQty,
          entry_price: positionEntryPrice,
          entry_time: new Date(position.entryTime).toISOString(),
          highest_price: position.highestPrice,
          partial_exits_executed: position.partialExitsExecuted,
        }
      : null;

    simulatedSession.strategy_config = {
      ...options?.strategyConfig,
      daily_buys_today: position?.dailyBuysToday ?? '',
      daily_buy_count: position?.dailyBuyCount ?? 0,
    };

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

    // Update highest price for trailing stop
    if (position && candle.close > position.highestPrice) {
      position.highestPrice = candle.close;
    }

    if (signal.action === 'buy') {
      const targetSizePct = Math.min(signal.positionSize ?? 0.1, maxPositionPct);
      const desiredCapital = cashUSD * targetSizePct;
      const rawQuantity = (desiredCapital * (1 - feeRate)) / candle.close;
      const roundedQuantity = roundToLotSize(symbol, rawQuantity);

      // Kanonisk risikosjekk (sync) før fill-beregning
      const currentEquity = cashUSD + positionQty * candle.close;
      const existingPositionValue = positionQty * positionEntryPrice;
      const orderValue = roundedQuantity * candle.close;
      const postTradePositionValue = existingPositionValue + orderValue;
      const postTradeExposure = postTradePositionValue; // backtest er single-symbol

      const postTradePositionPct =
        currentEquity > 0 ? (postTradePositionValue / currentEquity) * 100 : 0;
      const postTradeExposurePct =
        currentEquity > 0 ? (postTradeExposure / currentEquity) * 100 : 0;

      if (
        postTradePositionPct > limits.maxPositionPct ||
        postTradeExposurePct > limits.maxExposurePct
      ) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `Backtest buy skipped: risk limit exceeded (postTradePositionPct=${postTradePositionPct.toFixed(2)}%, max=${limits.maxPositionPct}%)`,
          );
        }
      } else {
        const fill = computeFill({
          side: 'buy',
          quantity: roundedQuantity,
          orderType: 'market',
          marketPrice: candle.close,
          feeRate,
          marketSlippageRate,
          minOrderValue: MIN_ORDER_VALUE_USDT,
          availableCapital: cashUSD,
          quoteCurrency: 'USDT',
        });

        if (!fill.success) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`Backtest buy skipped: ${fill.error}`);
          }
        } else {
          const today = new Date(candle.timestamp).toISOString().split('T')[0];
          const isNewPosition = isEmpty(ledger);

          const effectiveEntryPrice =
            fill.executedQuantity > 0
              ? fill.totalCost / fill.executedQuantity
              : fill.executedPrice;

          ledger = addLot(
            ledger,
            fill.executedQuantity,
            effectiveEntryPrice,
            new Date(candle.timestamp).toISOString(),
          );
          cashUSD -= fill.totalCost;

          tradePnlInputs.push({
            symbol,
            side: 'buy',
            quantity: fill.executedQuantity,
            price: fill.executedPrice,
            fee: fill.fee,
            timestamp: new Date(candle.timestamp).toISOString(),
            currency: 'USDT',
          });

          if (isNewPosition || !position) {
            position = {
              entryTime: candle.timestamp,
              highestPrice: candle.close,
              partialExitsExecuted: [],
              dailyBuysToday: today,
              dailyBuyCount: 1,
            };
          } else {
            position.dailyBuysToday = today;
            position.dailyBuyCount += 1;
          }

          // Update last_tick_at for time-based strategies (DCA)
          simulatedSession.last_tick_at = new Date(candle.timestamp).toISOString();
        }
      }
    } else if (signal.action === 'sell' && !isEmpty(ledger)) {
      const currentQty = getTotalQuantity(ledger);
      let rawQtyToSell: number;
      if (signal.quantity !== undefined) {
        // Absolute quantity sell (e.g. DCA partial take-profits)
        rawQtyToSell = Math.min(signal.quantity, currentQty);
      } else {
        const signalSize = signal.positionSize ?? 1.0;
        // positionSize er en brøk av total kapital; konverter til brøk av posisjonen
        const positionValueRatio =
          (currentQty * candle.close) / cashUSD || 1;
        const sellFraction = Math.min(signalSize / positionValueRatio, 1);
        rawQtyToSell = currentQty * sellFraction;
      }
      const qtyToSell = roundToLotSize(symbol, rawQtyToSell);

      if (qtyToSell > 0) {
        const fill = computeFill({
          side: 'sell',
          quantity: qtyToSell,
          orderType: 'market',
          marketPrice: candle.close,
          feeRate,
          marketSlippageRate,
          minOrderValue: MIN_ORDER_VALUE_USDT,
          quoteCurrency: 'USDT',
        });

        if (!fill.success) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`Backtest sell skipped: ${fill.error}`);
          }
        } else {
          const sellQty = Math.min(fill.executedQuantity, currentQty);
          const sellResult = sellFIFO(ledger, sellQty, fill.executedPrice);
          const grossRealizedPnl = sellResult.realizedPnl;
          const netPnl = grossRealizedPnl - fill.fee;
          const entryValue = sellResult.lotMatches.reduce(
            (sum, m) => sum + m.matchedQuantity * m.entryPrice,
            0,
          );
          const avgEntryPrice = sellQty > 0 ? entryValue / sellQty : 0;
          const earliestEntryTime =
            sellResult.lotMatches.length > 0
              ? Math.min(
                  ...sellResult.lotMatches.map((m) => {
                    const lot = ledger.lots.find((l) => l.id === m.lotId);
                    return lot
                      ? new Date(lot.timestamp).getTime()
                      : position?.entryTime ?? candle.timestamp;
                  }),
                )
              : position?.entryTime ?? candle.timestamp;

          const buyFeeForMatch = entryValue * (feeRate / (1 + feeRate));
          const roundTripFee = buyFeeForMatch + fill.fee;

          trades.push({
            entryTime: earliestEntryTime,
            exitTime: candle.timestamp,
            entryPrice: avgEntryPrice,
            exitPrice: fill.executedPrice,
            side: 'LONG',
            size: sellQty,
            pnl: netPnl,
            pnlPct: entryValue > 0 ? (netPnl / entryValue) * 100 : 0,
            fee: roundTripFee,
          });

          cashUSD += sellQty * fill.executedPrice - fill.fee;
          ledger = { ...ledger, lots: sellResult.remainingLots };

          tradePnlInputs.push({
            symbol,
            side: 'sell',
            quantity: sellQty,
            price: fill.executedPrice,
            fee: fill.fee,
            timestamp: new Date(candle.timestamp).toISOString(),
            currency: 'USDT',
          });

          if (!isEmpty(ledger) && position) {
            const target = signal.indicators?.target as number | undefined;
            if (target !== undefined) {
              position.partialExitsExecuted = [
                ...position.partialExitsExecuted,
                target,
              ];
            }
          } else {
            position = null;
          }
        }
      }
    }

    // Beregn daglig equity: cash + markedsverdi av åpne lots
    const currentEquity = cashUSD + getTotalQuantity(ledger) * candle.close;

    equityCurve.push({ timestamp: candle.timestamp, equity: currentEquity });

    if (currentEquity > maxEquity) {
      maxEquity = currentEquity;
    }
    const drawdown = (maxEquity - currentEquity) / maxEquity;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // Lukk åpen posisjon ved slutten (markedsverdi ved siste close, ingen ekstra fee)
  const lastCandle = data.length > 0 ? data[data.length - 1] : undefined;
  const remainingQty = getTotalQuantity(ledger);
  if (remainingQty > 0 && lastCandle) {
    const qtyToSell = roundToLotSize(symbol, remainingQty);

    if (qtyToSell > 0) {
      const sellResult = sellFIFO(ledger, qtyToSell, lastCandle.close);
      const grossRealizedPnl = sellResult.realizedPnl;
      const entryValue = sellResult.lotMatches.reduce(
        (sum, m) => sum + m.matchedQuantity * m.entryPrice,
        0,
      );
      const avgEntryPrice = qtyToSell > 0 ? entryValue / qtyToSell : 0;
      const earliestEntryTime =
        sellResult.lotMatches.length > 0
          ? Math.min(
              ...sellResult.lotMatches.map((m) => {
                const lot = ledger.lots.find((l) => l.id === m.lotId);
                return lot
                  ? new Date(lot.timestamp).getTime()
                  : position?.entryTime ?? lastCandle.timestamp;
              }),
            )
          : position?.entryTime ?? lastCandle.timestamp;

      const buyFeeForFinalMatch = entryValue * (feeRate / (1 + feeRate));

      trades.push({
        entryTime: earliestEntryTime,
        exitTime: lastCandle.timestamp,
        entryPrice: avgEntryPrice,
        exitPrice: lastCandle.close,
        side: 'LONG',
        size: qtyToSell,
        pnl: grossRealizedPnl,
        pnlPct: entryValue > 0 ? (grossRealizedPnl / entryValue) * 100 : 0,
        fee: buyFeeForFinalMatch,
      });

      cashUSD += qtyToSell * lastCandle.close;
      ledger = { ...ledger, lots: sellResult.remainingLots };

      tradePnlInputs.push({
        symbol,
        side: 'sell',
        quantity: qtyToSell,
        price: lastCandle.close,
        fee: 0,
        timestamp: new Date(lastCandle.timestamp).toISOString(),
        currency: 'USDT',
      });
    }
    position = null;
  }

  // Kanonisk P&L-sanity-check (utvikling/test only)
  if (process.env.NODE_ENV !== 'production' && tradePnlInputs.length > 0 && lastCandle) {
    const canonical = calculatePnlFromTrades(tradePnlInputs, lastCandle.close);
    const finalEquity = cashUSD + getTotalQuantity(ledger) * lastCandle.close;
    const enginePnl = finalEquity - initialCapital;
    const canonicalPnl = canonical.realizedPnl + canonical.unrealizedPnl;
    if (Math.abs(enginePnl - canonicalPnl) > 0.05) {
      console.warn(
        `Backtest P&L sanity mismatch: engine=${enginePnl.toFixed(4)} canonical=${canonicalPnl.toFixed(4)}`,
      );
    }
  }

  const finalEquity = cashUSD + getTotalQuantity(ledger) * (lastCandle?.close ?? 0);
  return calculateMetrics(trades, equityCurve, finalEquity, initialCapital, data);
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

  const usdNokRate = getUsdtToNokRate();
  const startValueNOK = initialCapital * usdNokRate;
  const endValueNOK = finalEquity * usdNokRate;

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
  options?: RunBacktestOptions,
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
 * Legacy backtest path for external signal arrays (AI logs, etc.).
 *
 * DENNE STIEN ER DEPRECATED / BEGRENSET:
 * - Bruker de samme kanoniske fill-/FIFO-/lot-size-/risiko-reglene som hovedmotoren
 *   så langt det er mulig, men den har ikke tilgang til strategi-state
 *   (partial exits, trailing stops, daily buy limits).
 * - Anbefalt for nye funksjoner: bruk shared strategies via runBacktest() uten
 *   externalSignals.
 */
function runBacktestLegacy(
  candles: OHLCV[],
  signals: ('BUY' | 'SELL' | 'HOLD')[],
  initialCapital: number,
  options?: RunBacktestOptions,
): BacktestResult & { enhancedMetrics: EnhancedBacktestMetrics } {
  const symbol = options?.symbol ?? 'BTCUSDT';
  const maxPositionPct = options?.maxPositionPct ?? 1.0;
  const feeRate = options?.feeRate ?? FEE_RATE;
  const marketSlippageRate = (options?.slippagePct ?? 0.2) / 100;

  const rawProfile = buildRawRiskProfile(options, 'ENSEMBLE_AI', symbol);
  const limits = resolveRiskLimits('paper', rawProfile);
  if (!limits) {
    throw new Error('Could not resolve risk limits for legacy backtest path');
  }

  const trades: Trade[] = [];
  const equityCurve: { timestamp: number; equity: number }[] = [];
  const tradePnlInputs: TradePnlInput[] = [];

  let cashUSD = initialCapital;
  let maxEquity = initialCapital;
  let maxDrawdown = 0;
  let ledger: LedgerState = createLedger('long');
  let positionEntryTime: number | null = null;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const signal = signals[i];
    const positionQty = getTotalQuantity(ledger);
    const positionEntryPrice = getWeightedEntryPrice(ledger);

    if (isEmpty(ledger) && signal === 'BUY') {
      const desiredCapital = cashUSD * maxPositionPct;
      const rawQuantity = (desiredCapital * (1 - feeRate)) / candle.close;
      const roundedQuantity = roundToLotSize(symbol, rawQuantity);
      const orderValue = roundedQuantity * candle.close;
      const currentEquity = cashUSD;
      const postTradePositionPct =
        currentEquity > 0 ? (orderValue / currentEquity) * 100 : 0;

      if (postTradePositionPct > limits.maxPositionPct) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `Legacy backtest buy skipped: risk limit exceeded (postTradePositionPct=${postTradePositionPct.toFixed(2)}%)`,
          );
        }
      } else {
        const fill = computeFill({
          side: 'buy',
          quantity: roundedQuantity,
          orderType: 'market',
          marketPrice: candle.close,
          feeRate,
          marketSlippageRate,
          minOrderValue: MIN_ORDER_VALUE_USDT,
          availableCapital: cashUSD,
          quoteCurrency: 'USDT',
        });

        if (!fill.success) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`Legacy backtest buy skipped: ${fill.error}`);
          }
        } else {
          const effectiveEntryPrice =
            fill.executedQuantity > 0
              ? fill.totalCost / fill.executedQuantity
              : fill.executedPrice;

          ledger = addLot(
            ledger,
            fill.executedQuantity,
            effectiveEntryPrice,
            new Date(candle.timestamp).toISOString(),
          );
          cashUSD -= fill.totalCost;
          positionEntryTime = candle.timestamp;

          tradePnlInputs.push({
            symbol,
            side: 'buy',
            quantity: fill.executedQuantity,
            price: fill.executedPrice,
            fee: fill.fee,
            timestamp: new Date(candle.timestamp).toISOString(),
            currency: 'USDT',
          });
        }
      }
    } else if (signal === 'SELL' && !isEmpty(ledger)) {
      const currentQty = getTotalQuantity(ledger);
      const qtyToSell = roundToLotSize(symbol, currentQty);

      if (qtyToSell > 0) {
        const fill = computeFill({
          side: 'sell',
          quantity: qtyToSell,
          orderType: 'market',
          marketPrice: candle.close,
          feeRate,
          marketSlippageRate,
          minOrderValue: MIN_ORDER_VALUE_USDT,
          quoteCurrency: 'USDT',
        });

        if (!fill.success) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`Legacy backtest sell skipped: ${fill.error}`);
          }
        } else {
          const sellQty = Math.min(fill.executedQuantity, currentQty);
          const sellResult = sellFIFO(ledger, sellQty, fill.executedPrice);
          const grossRealizedPnl = sellResult.realizedPnl;
          const netPnl = grossRealizedPnl - fill.fee;
          const entryValue = sellResult.lotMatches.reduce(
            (sum, m) => sum + m.matchedQuantity * m.entryPrice,
            0,
          );
          const avgEntryPrice = sellQty > 0 ? entryValue / sellQty : 0;
          const earliestEntryTime =
            sellResult.lotMatches.length > 0
              ? Math.min(
                  ...sellResult.lotMatches.map((m) => {
                    const lot = ledger.lots.find((l) => l.id === m.lotId);
                    return lot
                      ? new Date(lot.timestamp).getTime()
                      : positionEntryTime ?? candle.timestamp;
                  }),
                )
              : positionEntryTime ?? candle.timestamp;

          const buyFeeForMatch = entryValue * (feeRate / (1 + feeRate));
          const roundTripFee = buyFeeForMatch + fill.fee;

          trades.push({
            entryTime: earliestEntryTime,
            exitTime: candle.timestamp,
            entryPrice: avgEntryPrice,
            exitPrice: fill.executedPrice,
            side: 'LONG',
            size: sellQty,
            pnl: netPnl,
            pnlPct: entryValue > 0 ? (netPnl / entryValue) * 100 : 0,
            fee: roundTripFee,
          });

          cashUSD += sellQty * fill.executedPrice - fill.fee;
          ledger = { ...ledger, lots: sellResult.remainingLots };
          if (isEmpty(ledger)) positionEntryTime = null;

          tradePnlInputs.push({
            symbol,
            side: 'sell',
            quantity: sellQty,
            price: fill.executedPrice,
            fee: fill.fee,
            timestamp: new Date(candle.timestamp).toISOString(),
            currency: 'USDT',
          });
        }
      }
    }

    const currentEquity = cashUSD + getTotalQuantity(ledger) * candle.close;

    equityCurve.push({ timestamp: candle.timestamp, equity: currentEquity });

    if (currentEquity > maxEquity) {
      maxEquity = currentEquity;
    }
    const drawdown = (maxEquity - currentEquity) / maxEquity;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  if (!isEmpty(ledger) && candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const remainingQty = getTotalQuantity(ledger);
    const qtyToSell = roundToLotSize(symbol, remainingQty);

    if (qtyToSell > 0) {
      const sellResult = sellFIFO(ledger, qtyToSell, lastCandle.close);
      const grossRealizedPnl = sellResult.realizedPnl;
      const entryValue = sellResult.lotMatches.reduce(
        (sum, m) => sum + m.matchedQuantity * m.entryPrice,
        0,
      );
      const avgEntryPrice = qtyToSell > 0 ? entryValue / qtyToSell : 0;
      const earliestEntryTime =
        sellResult.lotMatches.length > 0
          ? Math.min(
              ...sellResult.lotMatches.map((m) => {
                const lot = ledger.lots.find((l) => l.id === m.lotId);
                return lot
                  ? new Date(lot.timestamp).getTime()
                  : positionEntryTime ?? lastCandle.timestamp;
              }),
            )
          : positionEntryTime ?? lastCandle.timestamp;

      const buyFeeForFinalMatch = entryValue * (feeRate / (1 + feeRate));

      trades.push({
        entryTime: earliestEntryTime,
        exitTime: lastCandle.timestamp,
        entryPrice: avgEntryPrice,
        exitPrice: lastCandle.close,
        side: 'LONG',
        size: qtyToSell,
        pnl: grossRealizedPnl,
        pnlPct: entryValue > 0 ? (grossRealizedPnl / entryValue) * 100 : 0,
        fee: buyFeeForFinalMatch,
      });

      cashUSD += qtyToSell * lastCandle.close;
      ledger = { ...ledger, lots: sellResult.remainingLots };

      tradePnlInputs.push({
        symbol,
        side: 'sell',
        quantity: qtyToSell,
        price: lastCandle.close,
        fee: 0,
        timestamp: new Date(lastCandle.timestamp).toISOString(),
        currency: 'USDT',
      });
    }
  }

  // Kanonisk P&L-sanity-check (utvikling/test only)
  if (process.env.NODE_ENV !== 'production' && tradePnlInputs.length > 0 && candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const canonical = calculatePnlFromTrades(tradePnlInputs, lastCandle.close);
    const finalEquity = cashUSD + getTotalQuantity(ledger) * lastCandle.close;
    const enginePnl = finalEquity - initialCapital;
    const canonicalPnl = canonical.realizedPnl + canonical.unrealizedPnl;
    if (Math.abs(enginePnl - canonicalPnl) > 0.05) {
      console.warn(
        `Legacy backtest P&L sanity mismatch: engine=${enginePnl.toFixed(4)} canonical=${canonicalPnl.toFixed(4)}`,
      );
    }
  }

  const finalEquity = cashUSD + getTotalQuantity(ledger) * (candles.length > 0 ? candles[candles.length - 1].close : 0);
  return calculateMetrics(trades, equityCurve, finalEquity, initialCapital, candles);
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
    symbol: config.symbol,
    riskProfile,
  });
  
  return { ...result, config };
}
