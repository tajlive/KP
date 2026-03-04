/**
 * Shared Trading Strategies for Supabase Edge Functions
 * Deno-compatible module for auto trading strategies
 */

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
    return {
      strategy_type: 'trend_balansert',
      symbol,
      action: 'BUY',
      confidence: 0.8,
      reason: `Golden Cross MA50=${ma50[i].toFixed(0)} > MA200=${ma200[i].toFixed(0)}, RSI=${rsiVal.toFixed(1)}`,
      entry_price: price,
      stop_loss: price * 0.93,
      take_profit: price * 1.15,
    };
  }
  
  if (deathCross) {
    return {
      strategy_type: 'trend_balansert',
      symbol,
      action: 'SELL',
      confidence: 0.75,
      reason: `Death Cross MA50=${ma50[i].toFixed(0)} < MA200=${ma200[i].toFixed(0)}`,
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
    return {
      strategy_type: 'multisignal_aktiv',
      symbol,
      action: 'BUY',
      confidence: score / 3,
      reason: reasons.join(' | '),
      entry_price: price,
      stop_loss: price * 0.97,
      take_profit: price * 1.06,
    };
  }
  
  if (rsiVal > 70) {
    return {
      strategy_type: 'multisignal_aktiv',
      symbol,
      action: 'SELL',
      confidence: 0.65,
      reason: `RSI=${rsiVal.toFixed(1)} overkjøpt`,
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

/**
 * Grid Bot: Grid trading strategi
 * Placeholder - full implementasjon krever mer tilstandshåndtering
 */
export async function evaluateGridBot(
  symbol = 'BTCUSDT',
  gridLevels: number[] = []
): Promise<Signal> {
  const price = await fetchPrice(symbol);
  
  // Enkel grid-logikk: kjøp på nedtrekk, selg på oppgang
  // Full implementasjon krever grid_bot_state tracking
  return {
    strategy_type: 'grid_bot',
    symbol,
    action: 'HOLD',
    confidence: 0.5,
    reason: 'Grid bot evaluering krever aktiv tilstand',
    entry_price: price,
  };
}

/**
 * AI Copy: Kopier AI-genererte signaler
 * Placeholder - krever integrasjon med AI-signalsystem
 */
export async function evaluateAICopy(symbol = 'BTCUSDT'): Promise<Signal> {
  const price = await fetchPrice(symbol);
  
  return {
    strategy_type: 'ai_copy',
    symbol,
    action: 'HOLD',
    confidence: 0.5,
    reason: 'AI Copy evaluering krever AI-signalsystem',
    entry_price: price,
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
  symbol = 'BTCUSDT'
): Promise<Signal | null> {
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
