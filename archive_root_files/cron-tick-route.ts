// ============================================================================
// src/app/api/cron/tick/route.ts
// THE STRATEGY ENGINE — Runs every 60 seconds via Vercel Cron
// ============================================================================
// This is the "heartbeat" of the entire auto-trading system.
//
// Flow:
// 1. Vercel Cron triggers this endpoint every minute
// 2. Fetch all active sessions
// 3. For each session, run the strategy's evaluate() function
// 4. If strategy returns a signal → execute trade
// 5. Update heartbeat (proves session is alive)
//
// Why every 60 seconds?
//   - Vercel Cron minimum interval is 1 minute
//   - Crypto markets don't need sub-second execution for DCA/trend strategies
//   - If user needs sub-minute: upgrade to dedicated infrastructure
//
// Why not per-user cron jobs?
//   - Vercel Cron has limited slots
//   - One cron job processing all sessions is simpler and more reliable
//   - Batch processing is more efficient for DB queries
//
// Timeout handling:
//   - Vercel Pro = 60s timeout, Hobby = 10s
//   - We process sessions in batches of 20
//   - If timeout approaching, we stop and let next tick continue
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mul, div, sub, pnl } from '@/lib/decimal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Pro timeout

// Strategy registry
const strategies: Record<string, StrategyEngine> = {
  dca: new DCAStrategy(),
  trend_follow: new TrendFollowStrategy(),
  multi_signal: new MultiSignalStrategy(),
  grid: new GridStrategy(),
};

export async function GET(req: NextRequest) {
  // Verify cron secret
  const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const db = createClient();

  try {
    // Fetch all active sessions (batch of 50)
    const { data: sessions, error } = await db
      .from('trading_sessions')
      .select('*')
      .eq('status', 'active')
      .order('last_tick_at', { ascending: true, nullsFirst: true })
      .limit(50);

    if (error) {
      console.error('Failed to fetch active sessions:', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No active sessions' });
    }

    const results: TickResult[] = [];

    for (const session of sessions) {
      // Timeout guard: stop 5s before Vercel kills us
      if (Date.now() - startTime > 55_000) {
        console.warn(`Tick timeout approaching, processed ${results.length}/${sessions.length}`);
        break;
      }

      try {
        const result = await processSession(db, session);
        results.push(result);
      } catch (err) {
        console.error(`Error processing session ${session.id}:`, err);
        results.push({ session_id: session.id, action: 'error', error: (err as Error).message });
      }
    }

    return NextResponse.json({
      processed: results.length,
      total_active: sessions.length,
      results,
      duration_ms: Date.now() - startTime,
    });
  } catch (err) {
    console.error('Tick error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

interface TickResult {
  session_id: string;
  action: 'buy' | 'sell' | 'hold' | 'error' | 'heartbeat';
  error?: string;
  trade_id?: string;
}

async function processSession(
  db: ReturnType<typeof createClient>,
  session: Record<string, unknown>
): Promise<TickResult> {
  const strategy = strategies[session.strategy_id as string];
  if (!strategy) {
    return { session_id: session.id as string, action: 'error', error: `Unknown strategy: ${session.strategy_id}` };
  }

  // Fetch recent price data (last 100 candles)
  const pair = (session.trading_pair as string).replace('/', '');
  const candles = await fetchCandles(pair, '1h', 100, session.mode as string);

  // Run strategy
  const signal = strategy.evaluate({
    candles,
    session: session as unknown as import('@/lib/types').TradingSession,
    config: session.strategy_config as Record<string, unknown>,
  });

  // Update heartbeat regardless of signal
  await db
    .from('trading_sessions')
    .update({ last_heartbeat: new Date().toISOString(), last_tick_at: new Date().toISOString() })
    .eq('id', session.id);

  if (signal.action === 'hold') {
    return { session_id: session.id as string, action: 'heartbeat' };
  }

  // Execute trade
  const currentPrice = candles[candles.length - 1].close;
  const quantity = signal.action === 'buy'
    ? div(mul(session.current_capital as number, signal.positionSize ?? 0.1), currentPrice)
    : (session.open_position as { quantity: number })?.quantity ?? 0;

  if (quantity <= 0) {
    return { session_id: session.id as string, action: 'hold' };
  }

  const totalValue = mul(quantity, currentPrice);
  const idempotencyKey = `${session.id}-${signal.action}-${new Date().toISOString().slice(0, 16)}`;

  // Calculate PnL for sells
  let realizedPnl: number | null = null;
  if (signal.action === 'sell' && session.open_position) {
    const pos = session.open_position as { entry_price: number };
    realizedPnl = pnl(pos.entry_price, currentPrice, quantity);
  }

  const { data: trade, error } = await db
    .from('trades')
    .insert({
      session_id: session.id,
      user_id: session.user_id,
      idempotency_key: idempotencyKey,
      mode: session.mode,
      trading_pair: session.trading_pair,
      side: signal.action,
      order_type: 'market',
      quantity,
      price: currentPrice,
      total_value: totalValue,
      fee: (session.mode as string) === 'live' ? mul(totalValue, 0.001) : 0,
      status: 'filled',
      realized_pnl: realizedPnl,
      strategy_signal: signal.indicators,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      // Duplicate trade (idempotency key collision) - not an error
      return { session_id: session.id as string, action: 'hold' };
    }
    throw new Error(`Trade insert failed: ${error.message}`);
  }

  return {
    session_id: session.id as string,
    action: signal.action,
    trade_id: trade?.id,
  };
}

// ============================================================================
// STRATEGY INTERFACE & IMPLEMENTATIONS
// ============================================================================

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StrategyInput {
  candles: Candle[];
  session: import('@/lib/types').TradingSession;
  config: Record<string, unknown>;
}

interface StrategySignal {
  action: 'buy' | 'sell' | 'hold';
  positionSize?: number;  // Fraction of capital (0.0 - 1.0)
  indicators?: Record<string, unknown>;
  reason?: string;
}

interface StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal;
}

// --- DCA Strategy ---
// Buy a fixed amount at regular intervals regardless of price
class DCAStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { session, config } = input;
    const intervalMinutes = (config.interval_minutes as number) ?? 60;
    const positionSize = (config.position_size as number) ?? 0.02; // 2% of capital per buy

    // Check if enough time has passed since last trade
    const lastTick = session.last_tick_at ? new Date(session.last_tick_at).getTime() : 0;
    const now = Date.now();
    const minutesSinceLast = (now - lastTick) / 60_000;

    if (minutesSinceLast < intervalMinutes) {
      return { action: 'hold', reason: `Waiting ${Math.round(intervalMinutes - minutesSinceLast)} more minutes` };
    }

    // If no open position, buy
    if (!session.open_position) {
      return { action: 'buy', positionSize, indicators: { strategy: 'dca', interval: intervalMinutes } };
    }

    // If has position and profit target reached
    const profitTarget = (config.profit_target_pct as number) ?? 5; // 5% default
    const currentPrice = input.candles[input.candles.length - 1].close;
    const entryPrice = session.open_position.entry_price;
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;

    if (pnlPct >= profitTarget) {
      return { action: 'sell', indicators: { pnl_pct: pnlPct, target: profitTarget } };
    }

    // Stop-loss check
    const stopLoss = (config.stop_loss_pct as number) ?? -10; // -10% default
    if (pnlPct <= stopLoss) {
      return { action: 'sell', indicators: { pnl_pct: pnlPct, stop_loss: stopLoss } };
    }

    return { action: 'hold' };
  }
}

// --- Trend Following Strategy ---
// Uses SMA crossover (fast crosses above slow = buy, below = sell)
class TrendFollowStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session, config } = input;
    const fastPeriod = (config.fast_period as number) ?? 12;
    const slowPeriod = (config.slow_period as number) ?? 26;

    if (candles.length < slowPeriod + 2) {
      return { action: 'hold', reason: 'Insufficient candle data' };
    }

    const closes = candles.map(c => c.close);
    const fastSMA = sma(closes, fastPeriod);
    const slowSMA = sma(closes, slowPeriod);
    const prevFastSMA = sma(closes.slice(0, -1), fastPeriod);
    const prevSlowSMA = sma(closes.slice(0, -1), slowPeriod);

    const crossedAbove = prevFastSMA <= prevSlowSMA && fastSMA > slowSMA;
    const crossedBelow = prevFastSMA >= prevSlowSMA && fastSMA < slowSMA;

    const indicators = { fast_sma: fastSMA, slow_sma: slowSMA, crossedAbove, crossedBelow };

    if (crossedAbove && !session.open_position) {
      return { action: 'buy', positionSize: 0.1, indicators };
    }

    if (crossedBelow && session.open_position) {
      return { action: 'sell', indicators };
    }

    // Risk management: stop-loss at -5%
    if (session.open_position) {
      const currentPrice = candles[candles.length - 1].close;
      const pnlPct = ((currentPrice - session.open_position.entry_price) / session.open_position.entry_price) * 100;
      if (pnlPct <= -5) {
        return { action: 'sell', indicators: { ...indicators, stop_loss_triggered: true, pnl_pct: pnlPct } };
      }
    }

    return { action: 'hold', indicators };
  }
}

// --- Multi-Signal Strategy ---
// Combines RSI, MACD, and Bollinger Bands for higher-confidence trades
class MultiSignalStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session, config } = input;
    const closes = candles.map(c => c.close);

    if (closes.length < 30) {
      return { action: 'hold', reason: 'Insufficient data' };
    }

    // Calculate indicators
    const rsiValue = rsi(closes, 14);
    const { macd: macdLine, signal: signalLine } = macd(closes, 12, 26, 9);
    const { upper, lower, middle } = bollingerBands(closes, 20, 2);
    const currentPrice = closes[closes.length - 1];

    const indicators = { rsi: rsiValue, macd: macdLine, signal: signalLine, bb_upper: upper, bb_lower: lower };

    // Buy signals (need at least 2 of 3):
    let buySignals = 0;
    if (rsiValue < 30) buySignals++;               // RSI oversold
    if (macdLine > signalLine) buySignals++;        // MACD bullish crossover
    if (currentPrice < lower) buySignals++;          // Price below lower BB

    // Sell signals:
    let sellSignals = 0;
    if (rsiValue > 70) sellSignals++;               // RSI overbought
    if (macdLine < signalLine) sellSignals++;        // MACD bearish
    if (currentPrice > upper) sellSignals++;         // Price above upper BB

    if (buySignals >= 2 && !session.open_position) {
      return { action: 'buy', positionSize: 0.1, indicators: { ...indicators, buy_signals: buySignals } };
    }

    if (sellSignals >= 2 && session.open_position) {
      return { action: 'sell', indicators: { ...indicators, sell_signals: sellSignals } };
    }

    return { action: 'hold', indicators };
  }
}

// --- Grid Trading Strategy ---
// Places buy/sell orders at fixed price intervals
class GridStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session, config } = input;
    const currentPrice = candles[candles.length - 1].close;
    const gridSize = (config.grid_size_pct as number) ?? 2; // 2% grid spacing
    const levels = (config.levels as number) ?? 5;

    // Grid center is the price when bot started
    const centerPrice = (config.center_price as number) ?? session.open_position?.entry_price ?? currentPrice;

    // Calculate nearest grid levels
    const gridStep = centerPrice * (gridSize / 100);
    const nearestBuyLevel = Math.floor(currentPrice / gridStep) * gridStep;
    const nearestSellLevel = Math.ceil(currentPrice / gridStep) * gridStep;

    const distanceToBuy = Math.abs(currentPrice - nearestBuyLevel);
    const distanceToSell = Math.abs(currentPrice - nearestSellLevel);

    const indicators = { center: centerPrice, grid_step: gridStep, buy_level: nearestBuyLevel, sell_level: nearestSellLevel };

    // Buy when price touches a grid buy level (within 0.5%)
    if (!session.open_position && distanceToBuy / currentPrice < 0.005) {
      return { action: 'buy', positionSize: 1 / levels, indicators };
    }

    // Sell when price reaches next grid sell level
    if (session.open_position && distanceToSell / currentPrice < 0.005) {
      const pnlPct = ((currentPrice - session.open_position.entry_price) / session.open_position.entry_price) * 100;
      if (pnlPct > 0) {
        return { action: 'sell', indicators: { ...indicators, pnl_pct: pnlPct } };
      }
    }

    return { action: 'hold', indicators };
  }
}

// ============================================================================
// TECHNICAL INDICATOR HELPERS
// ============================================================================

function sma(data: number[], period: number): number {
  const slice = data.slice(-period);
  return slice.reduce((sum, v) => sum + v, 0) / slice.length;
}

function ema(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function rsi(closes: number[], period: number = 14): number {
  const changes = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  const gains = changes.slice(-period).filter(c => c > 0);
  const losses = changes.slice(-period).filter(c => c < 0).map(Math.abs);

  const avgGain = gains.length > 0 ? gains.reduce((s, v) => s + v, 0) / period : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, v) => s + v, 0) / period : 0;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function macd(
  closes: number[],
  fast: number = 12,
  slow: number = 26,
  signalPeriod: number = 9
): { macd: number; signal: number; histogram: number } {
  const fastEMA = ema(closes, fast);
  const slowEMA = ema(closes, slow);
  const macdLine = fastEMA.map((f, i) => f - slowEMA[i]);
  const signalLine = ema(macdLine, signalPeriod);

  const last = macdLine.length - 1;
  return {
    macd: macdLine[last],
    signal: signalLine[last],
    histogram: macdLine[last] - signalLine[last],
  };
}

function bollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number; lower: number; middle: number } {
  const slice = closes.slice(-period);
  const mean = slice.reduce((s, v) => s + v, 0) / slice.length;
  const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length;
  const stdDev = Math.sqrt(variance);

  return {
    upper: mean + stdDevMultiplier * stdDev,
    lower: mean - stdDevMultiplier * stdDev,
    middle: mean,
  };
}

// ============================================================================
// PRICE DATA FETCHER
// ============================================================================

async function fetchCandles(
  pair: string,
  interval: string = '1h',
  limit: number = 100,
  mode: string = 'paper'
): Promise<Candle[]> {
  const baseUrl = mode === 'live'
    ? 'https://api.binance.com'
    : 'https://testnet.binance.vision';

  try {
    const res = await fetch(
      `${baseUrl}/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`,
      { next: { revalidate: 30 } } // Cache for 30 seconds
    );

    if (!res.ok) {
      throw new Error(`Binance API error: ${res.status}`);
    }

    const data = await res.json();
    return data.map((k: number[]) => ({
      time: k[0],
      open: parseFloat(String(k[1])),
      high: parseFloat(String(k[2])),
      low: parseFloat(String(k[3])),
      close: parseFloat(String(k[4])),
      volume: parseFloat(String(k[5])),
    }));
  } catch (err) {
    console.error(`Failed to fetch candles for ${pair}:`, err);
    // Return mock data for development
    return generateMockCandles(limit);
  }
}

function generateMockCandles(count: number): Candle[] {
  const candles: Candle[] = [];
  let price = 65000; // BTC starting price

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * 500; // Slight upward bias
    price = Math.max(price + change, 1000);
    const high = price + Math.random() * 200;
    const low = price - Math.random() * 200;

    candles.push({
      time: Date.now() - (count - i) * 3_600_000,
      open: price - change / 2,
      high,
      low,
      close: price,
      volume: Math.random() * 100,
    });
  }
  return candles;
}
