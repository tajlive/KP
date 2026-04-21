/**
 * CRON TICK ENGINE - Unified Trading System
 * Processes ALL trading sessions with integrated Risk Management
 *
 * CRITICAL: Every trade MUST pass RiskManager.canExecuteTrade() BEFORE execution
 */

import { RiskConfig, RiskManager } from "@/lib/auto-trading/risk-manager";
import { resolveTickStrategyEngineKey } from "@/lib/trading/strategy-id-aliases";
import { buildTradeReason, buildIndicatorSnapshot, resolveStrategyKey } from "@/lib/trading/build-trade-reason";
import { div, mul } from "@/lib/decimal";
import { createClient } from "@/lib/supabase/server";
import { captureCronError, captureCronSuccess, generateTradeIdempotencyKey } from "@/lib/cron/cron-helpers";
import type { TradeSide, TradingSession } from "@/types/trading";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import {
  createLedger, addLot, sellFIFO, getWeightedEntryPrice,
  getTotalQuantity, migrateFromLegacy, toLegacyPosition,
  type LedgerState,
} from "@/lib/trading/position-ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// maxDuration arves fra vercel.json (300s) — overstyr ikke her

// Types
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
  session: TradingSession;
  config: Record<string, unknown>;
}

interface StrategySignal {
  action: "buy" | "sell" | "hold";
  positionSize?: number;
  indicators?: Record<string, unknown>;
  reason?: string;
}

interface StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal;
}

interface TickResult {
  session_id: string;
  action: "buy" | "sell" | "hold" | "error" | "heartbeat" | "risk_blocked";
  error?: string;
  trade_id?: string;
  risk_reason?: string;
}

// Technical Indicators
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
  const gains = changes.slice(-period).filter((c) => c > 0);
  const losses = changes
    .slice(-period)
    .filter((c) => c < 0)
    .map(Math.abs);
  const avgGain =
    gains.length > 0 ? gains.reduce((s, v) => s + v, 0) / period : 0;
  const avgLoss =
    losses.length > 0 ? losses.reduce((s, v) => s + v, 0) / period : 0;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function macd(
  closes: number[],
  fast: number = 12,
  slow: number = 26,
  signalPeriod: number = 9,
) {
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

// Strategy Implementations
class DCAStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { session, config, candles } = input;
    const intervalMinutes = (config.interval_minutes as number) ?? 30; // Redusert fra 60
    let positionSize = (config.position_size as number) ?? 0.05; // Økt fra 0.02
    const lastTick = session.last_tick_at
      ? new Date(session.last_tick_at).getTime()
      : 0;
    const now = Date.now();
    const minutesSinceLast = (now - lastTick) / 60_000;

    if (minutesSinceLast < intervalMinutes) {
      return {
        action: "hold",
        reason: `Waiting ${Math.round(intervalMinutes - minutesSinceLast)} min`,
      };
    }

    // Volatility-Harvesting: buy more in dips, less in FOMO
    const closes = candles.map((c) => c.close);
    if (closes.length >= 24) {
      const price24hAgo = closes[closes.length - 24];
      const currentPriceNow = closes[closes.length - 1];
      const change24h = ((currentPriceNow - price24hAgo) / price24hAgo) * 100;
      if (change24h <= -5)
        positionSize *= 3; // Big dip → 3x buy
      else if (change24h <= -3)
        positionSize *= 2; // Medium dip → 2x buy
      else if (change24h >= 5) positionSize *= 0.5; // FOMO → halve buy
    }

    if (!session.open_position) {
      return {
        action: "buy",
        positionSize,
        indicators: {
          strategy: "dca",
          interval: intervalMinutes,
          volatility_adjusted: true,
        },
      };
    }

    const profitTarget = (config.profit_target_pct as number) ?? 5;
    const currentPrice = candles[candles.length - 1].close;
    const entryPrice = session.open_position.entry_price;
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;

    if (pnlPct >= profitTarget)
      return {
        action: "sell",
        indicators: { pnl_pct: pnlPct, target: profitTarget },
      };

    const stopLoss = (config.stop_loss_pct as number) ?? -10;
    if (pnlPct <= stopLoss)
      return {
        action: "sell",
        indicators: { pnl_pct: pnlPct, stop_loss: stopLoss },
      };

    return { action: "hold" };
  }
}

class TrendFollowStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session, config } = input;
    const fastPeriod = (config.fast_period as number) ?? 8;  // Raskere: 8 istedenfor 12
    const slowPeriod = (config.slow_period as number) ?? 21; // Raskere: 21 istedenfor 26

    if (candles.length < slowPeriod + 2) {
      return { action: "hold", reason: "Insufficient candle data" };
    }

    const closes = candles.map((c) => c.close);
    const fastSMA = sma(closes, fastPeriod);
    const slowSMA = sma(closes, slowPeriod);
    const prevFastSMA = sma(closes.slice(0, -1), fastPeriod);
    const prevSlowSMA = sma(closes.slice(0, -1), slowPeriod);

    const crossedAbove = prevFastSMA <= prevSlowSMA && fastSMA > slowSMA;
    const crossedBelow = prevFastSMA >= prevSlowSMA && fastSMA < slowSMA;
    const indicators = {
      fast_sma: fastSMA,
      slow_sma: slowSMA,
      crossedAbove,
      crossedBelow,
    };

    if (crossedAbove && !session.open_position) {
      return { action: "buy", positionSize: 0.1, indicators };
    }

    if (crossedBelow && session.open_position) {
      return { action: "sell", indicators };
    }

    return { action: "hold", indicators };
  }
}

class MultiSignalStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session } = input;
    const closes = candles.map((c) => c.close);

    if (closes.length < 20) {
      return { action: "hold", reason: "Insufficient data" };
    }

    const rsiValue = rsi(closes, 14);
    const { macd: macdLine, signal: signalLine } = macd(closes, 12, 26, 9);
    const indicators = { rsi: rsiValue, macd: macdLine, signal: signalLine };

    // Mer aggressive signal-terskler
    let buySignals = 0;
    if (rsiValue < 45) buySignals++; // Endret fra 30
    if (macdLine > signalLine) buySignals++;
    if (closes[closes.length - 1] > closes[closes.length - 5]) buySignals++; // Price momentum

    let sellSignals = 0;
    if (rsiValue > 55) sellSignals++; // Endret fra 70
    if (macdLine < signalLine) sellSignals++;

    if (buySignals >= 2 && !session.open_position) {
      return {
        action: "buy",
        positionSize: 0.1,
        indicators: { ...indicators, buy_signals: buySignals },
      };
    }

    if (sellSignals >= 2 && session.open_position) {
      return {
        action: "sell",
        indicators: { ...indicators, sell_signals: sellSignals },
      };
    }

    return { action: "hold", indicators };
  }
}

// Grid Bot Engine — real grid trading with price levels
class GridBotEngine implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session, config } = input;
    const currentPrice = candles[candles.length - 1].close;
    const upper =
      (config.upper_price as number) ??
      (config.upperPrice as number) ??
      currentPrice * 1.1;
    const lower =
      (config.lower_price as number) ??
      (config.lowerPrice as number) ??
      currentPrice * 0.9;
    const levels =
      (config.grid_levels as number) ?? (config.levels as number) ?? 10;
    const gridSize = (upper - lower) / levels;

    if (currentPrice > upper || currentPrice < lower) {
      return { action: "hold", reason: "Price outside grid range" };
    }

    const currentLevel = Math.floor((currentPrice - lower) / gridSize);
    const gridBuyPrice = lower + gridSize * currentLevel;
    const gridSellPrice = gridBuyPrice + gridSize;

    // Buy if near grid buy level (within 0.5%)
    if (!session.open_position && currentPrice <= gridBuyPrice * 1.005) {
      return {
        action: "buy",
        positionSize: 1 / levels,
        indicators: {
          grid_level: currentLevel,
          buy_at: gridBuyPrice,
          sell_at: gridSellPrice,
        },
        reason: `Grid buy at level ${currentLevel} ($${gridBuyPrice.toFixed(0)})`,
      };
    }

    // Sell if near grid sell level (within 0.5%)
    if (session.open_position && currentPrice >= gridSellPrice * 0.995) {
      return {
        action: "sell",
        indicators: { grid_level: currentLevel, sell_at: gridSellPrice },
        reason: `Grid sell at level ${currentLevel} ($${gridSellPrice.toFixed(0)})`,
      };
    }

    return { action: "hold", indicators: { grid_level: currentLevel } };
  }
}

const strategies: Record<string, StrategyEngine> = {
  dca: new DCAStrategy(),
  trend_follow: new TrendFollowStrategy(),
  multi_signal: new MultiSignalStrategy(),
  grid: new GridBotEngine(),
};

// Price Data Fetcher — ALWAYS uses Binance mainnet for paper/live parity
async function fetchCandles(
  pair: string,
  interval: string = "1h",
  limit: number = 100,
): Promise<Candle[]> {
  // Always use mainnet — paper and live see identical prices
  const baseUrl = "https://api.binance.com";
  const symbol = pair.replace("/", "");

  try {
    const res = await fetch(
      `${baseUrl}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      {
        next: { revalidate: 30 },
      },
    );

    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);

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
    console.error("Binance API fetch failed:", err);
    throw new Error(`BINANCE_API_UNAVAILABLE: ${(err as Error).message}`);
  }
}

/**
 * CRITICAL: Process session with Risk Management
 */
async function processSession(
  db: SupabaseClient<Database>,
  session: TradingSession,
  userRiskConfig?: RiskConfig,
): Promise<TickResult> {
  const engineKey = resolveTickStrategyEngineKey(session.strategy_id);
  const pair = session.trading_pair || "BTCUSDT";
  const candles = await fetchCandles(pair, "1h", 100);
  const currentPrice = candles[candles.length - 1].close;

  let signal: StrategySignal;

  if (engineKey === "ensemble_ai") {
    // Normalize symbol to match ai-engine storage (e.g. BTC/USDT -> BTCUSDT)
    const symbol = pair.replace("/", "");
    // Prefer master consensus row; fallback to any ensemble_ai signal (legacy compatibility)
    let aiSignal = await db
      .from("trading_signals")
      .select("*")
      .eq("symbol", symbol)
      .eq("signal_type", "ensemble_ai")
      .eq("agent_id", "ensemble_master")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then((r) => r.data);

    if (!aiSignal) {
      aiSignal = await db
        .from("trading_signals")
        .select("*")
        .eq("symbol", symbol)
        .eq("signal_type", "ensemble_ai")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then((r) => r.data);
    }

    const maxAgeMs = 2 * 60 * 60 * 1000; // 2 hours
    const isRecent = aiSignal?.created_at
      ? Date.now() - new Date(aiSignal.created_at).getTime() < maxAgeMs
      : false;

    if (aiSignal && isRecent && (aiSignal.action === "buy" || aiSignal.action === "sell")) {
      signal = {
        action: aiSignal.action,
        positionSize: 0.01,
        indicators: { source: "ensemble_ai", confidence: aiSignal.confidence },
        reason: aiSignal.reasoning || "Ensemble AI signal",
      };
    } else {
      signal = { action: "hold", reason: "No recent ensemble AI signal" };
    }
  } else {
    const strategy = engineKey ? strategies[engineKey] : undefined;
    if (!strategy) {
      return {
        session_id: session.id,
        action: "error",
        error: `Unknown strategy: ${session.strategy_id}`,
      };
    }
    signal = strategy.evaluate({
      candles,
      session,
      config: session.strategy_config as Record<string, unknown>,
    });
  }

  // Update heartbeat
  await db
    .from("trading_sessions")
    .update({
      last_heartbeat: new Date().toISOString(),
      last_tick_at: new Date().toISOString(),
    } as never).eq("id", session.id);

  // Trailing take-profit check on open positions
  if (session.open_position && signal.action === "hold") {
    const entryPrice = session.open_position.entry_price;
    const highest = session.open_position.highest_price ?? entryPrice;
    const trailingPct =
      ((session.strategy_config as Record<string, unknown>)
        ?.trailing_stop_pct as number) ?? 5;

    // Update highest price tracking
    if (currentPrice > highest) {
      await db
        .from("trading_sessions")
        .update({
          open_position: {
            ...session.open_position,
            highest_price: currentPrice,
          },
        })
        .eq("id", session.id);
    }

    // Trailing stop: if price drops X% from peak AND still in profit
    const dropFromPeak = ((highest - currentPrice) / highest) * 100;
    if (dropFromPeak >= trailingPct && currentPrice > entryPrice) {
      // Trigger trailing take-profit sell
      signal.action = "sell";
      signal.reason = `Trailing TP: dropped ${dropFromPeak.toFixed(1)}% from peak $${highest.toFixed(0)}`;
    }

    // Partial Take-Profit: Sell portions at predefined targets
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
    const partialLevels = (session.strategy_config as Record<string, unknown>)
      ?.partial_tp_levels as
      | Array<{ target_pct: number; sell_pct: number }>
      | undefined;

    if (partialLevels && partialLevels.length > 0) {
      // Find which level we're at (if any)
      const positionWithExits =
        session.open_position as typeof session.open_position & {
          partial_exits_executed?: number[];
        };
      const executedLevels = positionWithExits.partial_exits_executed || [];
      const nextLevel = partialLevels.find(
        (l) => pnlPct >= l.target_pct && !executedLevels.includes(l.target_pct),
      );

      if (nextLevel) {
        // Execute partial exit - sell percentage of current position
        const sellFraction = nextLevel.sell_pct / 100;
        const currentQty = session.open_position.quantity || 1;
        signal.action = "sell";
        signal.positionSize =
          (sellFraction * currentQty) / session.current_capital;
        signal.reason = `Partial TP: ${nextLevel.sell_pct}% at +${nextLevel.target_pct}% target`;

        // Mark this level as executed
        await db
          .from("trading_sessions")
          .update({
            open_position: {
              ...session.open_position,
              partial_exits_executed: [...executedLevels, nextLevel.target_pct],
            },
          })
          .eq("id", session.id);
      }
    }
  }

  // If hold, just return heartbeat
  if (signal.action === "hold") {
    return { session_id: session.id, action: "heartbeat" };
  }

  // For grid strategy: cap positionSize by maxPositionSizePercent
  const stratCfg = (session.strategy_config as Record<string, unknown>) ?? {};
  const DEFAULTS: RiskConfig = {
    maxPositionSizePercent: 10,
    stopLossPercent: 1,
    trailingStopLossPercent: 1.5,
    maxDailyLossPercent: 5,
    maxDailyTrades: 10,
    maxDrawdownPercent: 15,
    maxLeverage: 1,
  };
  const riskConfig: RiskConfig = userRiskConfig || (stratCfg.risk_config as RiskConfig) || DEFAULTS;

  if (engineKey === "grid" && signal.positionSize) {
    const maxGridPos = riskConfig.maxPositionSizePercent / 100;
    signal.positionSize = Math.min(signal.positionSize, maxGridPos);
  }

  // Calculate trade details
  const positionSize = signal.positionSize ?? 0.1;
  const tradeAmount = session.current_capital * positionSize;
  const quantity = div(tradeAmount, currentPrice);

  if (quantity <= 0) {
    return { session_id: session.id, action: "hold" };
  }

  const riskManager = new RiskManager(riskConfig);

  const riskCheck = await riskManager.canExecuteTrade({
    userId: session.user_id,
    sessionId: session.id,
    tradeAmount: tradeAmount,
    currentCapital: session.current_capital,
    direction: signal.action === "buy" ? "LONG" : "SHORT",
    symbol: pair,
  });

  if (!riskCheck.allowed) {
    // Log risk block to database - using correct table schema
    const riskLogDetails = {
      reason: riskCheck.reason,
      signal: signal.action,
      requested_amount: tradeAmount,
      current_capital: session.current_capital,
      risk_config: { ...riskConfig },
    } as Database["public"]["Tables"]["trading_logs"]["Insert"]["details"];

    await db.from("trading_logs").insert({
      session_id: session.id,
      user_id: session.user_id,
      action: "risk_blocked",
      details: riskLogDetails,
    } as never);

    console.warn("Trade blocked by risk manager:", {
      session_id: session.id,
      reason: riskCheck.reason,
    });

    return {
      session_id: session.id,
      action: "risk_blocked",
      risk_reason: riskCheck.reason,
    };
  }

  // Calculate stop loss
  const stopLossPrice = riskManager.calculateStopLoss({
    entryPrice: currentPrice,
    direction: signal.action === "buy" ? "LONG" : "SHORT",
  });

  // Build reason code and indicator snapshot for trade explanation
  const strategyKey = resolveStrategyKey(session.strategy_id);
  const { reasonCode, reasonParams } = buildTradeReason({
    side: signal.action as TradeSide,
    strategyKey,
    indicators: ((signal.indicators || {}) as unknown as Record<string, unknown>) || null,
    currentPrice,
    candles,
    entryPrice: session.open_position?.entry_price,
  });
  const indicatorSnapshot = buildIndicatorSnapshot(candles, (signal.indicators as unknown as Record<string, unknown>) || null);

  // Calculate realized P&L for sell trades using FIFO cost basis
  let realizedPnl: number | undefined;
  let updatedLedgerState: LedgerState | null = null;
  if (signal.action === "sell" && session.open_position) {
    // Build FIFO ledger: use lots if available, otherwise migrate from legacy
    const ledger: LedgerState = session.open_position.lots
      ? { side: session.open_position.side || "long", lots: session.open_position.lots as LedgerState["lots"] }
      : migrateFromLegacy(session.open_position);

    const positionQty = getTotalQuantity(ledger);
    const matchedQty = Math.min(quantity, positionQty);
    if (matchedQty > 0) {
      try {
        const sellResult = sellFIFO(ledger, matchedQty, currentPrice);
        realizedPnl = sellResult.realizedPnl;
        updatedLedgerState = { ...ledger, lots: sellResult.remainingLots };
      } catch {
        // Fallback to simple P&L if FIFO fails (e.g., insufficient quantity edge case)
        const entryPrice = session.open_position.entry_price;
        realizedPnl = Math.round((currentPrice - entryPrice) * matchedQty * 100) / 100;
      }
    }
  }

  // Execute trade
  const totalValue = mul(quantity, currentPrice);
  const idempotencyKey = generateTradeIdempotencyKey(session.id, pair, signal.action);

  const { data: trade, error: tradeError } = await db
    .from("trades")
    .insert({
      session_id: session.id,
      user_id: session.user_id,
      idempotency_key: idempotencyKey,
      mode: session.mode,
      trading_pair: session.trading_pair,
      side: signal.action as TradeSide,
      order_type: "market",
      quantity,
      price: currentPrice,
      total_value: totalValue,
      fee: session.mode === "live" ? mul(totalValue, 0.001) : 0,
      status: "filled",
      realized_pnl: realizedPnl,
      strategy_signal: { ...signal.indicators, stop_loss: stopLossPrice },
      // Explanation data
      reason_code: reasonCode,
      reason_params: reasonParams as unknown as Json,
      indicator_snapshot: indicatorSnapshot as unknown as Json,
      executed_at: new Date().toISOString(),
    } as never)
    .select("id")
    .single();

  if (tradeError) {
    console.error("Trade insert failed:", {
      session_id: session.id,
      error: tradeError.message,
      code: tradeError.code,
    });

    throw new Error(`Trade insert failed: ${tradeError.message}`);
  }

  // Update session position state with FIFO lots
  if (signal.action === "buy") {
    // Build ledger from current position (or create new)
    const ledger: LedgerState = session.open_position?.lots
      ? { side: session.open_position.side || "long", lots: session.open_position.lots as LedgerState["lots"] }
      : session.open_position
        ? migrateFromLegacy(session.open_position)
        : createLedger("long");

    const updatedLedger = addLot(ledger, quantity, currentPrice);
    const legacyPos = toLegacyPosition(updatedLedger);

    if (legacyPos) {
      await db
        .from("trading_sessions")
        .update({
          open_position: {
            ...legacyPos,
            highest_price: session.open_position?.highest_price ?? currentPrice,
          },
        } as never)
        .eq("id", session.id);
    }
  } else if (signal.action === "sell" && updatedLedgerState) {
    // Update with remaining lots after FIFO sell
    const legacyPos = toLegacyPosition(updatedLedgerState);
    await db
      .from("trading_sessions")
      .update({
        open_position: legacyPos
          ? {
              ...legacyPos,
              highest_price: session.open_position?.highest_price,
            }
          : null,
      } as never)
      .eq("id", session.id);
  }

  // Log successful trade
  console.info("Trade executed:", {
    session_id: session.id,
    trade_id: trade?.id,
    side: signal.action,
    amount: tradeAmount,
    fifo_lots: updatedLedgerState?.lots.length ?? 0,
  });

  return {
    session_id: session.id,
    action: signal.action,
    trade_id: trade?.id,
  };
}

/**
 * Mirror a trade to all copy trading sessions
 */
async function mirrorTradeToFollowers(
  db: SupabaseClient<Database>,
  sourceSessionId: string,
  trade: Record<string, unknown>,
): Promise<void> {
  try {
    // Find all active followers of this session
    const { data: followers } = await db
      .from("trading_sessions")
      .select("*")
      .eq("copy_source_session_id", sourceSessionId)
      .eq("status", "active");

    if (!followers || followers.length === 0) return;

    for (const followerSession of followers) {
      // Calculate follower's position size based on capital ratio
      const tradeValue = (trade.total_value as number) || 0;
      const sourceCapital =
        ((trade.session as Record<string, unknown>)
          ?.current_capital as number) || 1;
      const sourceCapitalRatio = tradeValue / sourceCapital;
      const followerTradeAmount =
        followerSession.current_capital * sourceCapitalRatio;

      if (followerTradeAmount <= 0) continue;

      const tradePrice = (trade.price as number) || 1;
      const followerQuantity = div(followerTradeAmount, tradePrice);

      // Insert mirrored trade - matching actual trades table schema
      const tradeRecord = trade as Record<string, unknown>;
      const { error: mirrorError } = await db.from("trades").insert({
        session_id: followerSession.id,
        user_id: followerSession.user_id,
        idempotency_key: generateTradeIdempotencyKey(
          followerSession.id,
          tradeRecord.trading_pair as string,
          tradeRecord.side as string,
        ),
        mode: followerSession.mode,
        trading_pair: tradeRecord.trading_pair as string,
        side: tradeRecord.side as string,
        order_type: "market",
        quantity: followerQuantity,
        price: tradePrice,
        total_value: followerTradeAmount,
        fee:
          followerSession.mode === "live" ? mul(followerTradeAmount, 0.001) : 0,
        status: "filled",
        strategy_signal: {
          ...(tradeRecord.strategy_signal as Record<string, unknown>),
          copied_from: tradeRecord.id as string,
        },
        executed_at: new Date().toISOString(),
        is_copy: true,
        leader_trade_id: tradeRecord.id as string,
      } as never);

      if (mirrorError) {
        console.warn(
          `Failed to mirror trade ${trade.id} to follower ${followerSession.id}:`,
          mirrorError.message,
        );
      } else {
        console.info(
          `Trade ${trade.id} mirrored to copy session ${followerSession.id}`,
        );
      }
    }
  } catch (err) {
    console.error("Error mirroring trade to followers:", err);
  }
}

/**
 * Main Cron Handler - Unified Trading System for Paper, Live, and Copy Modes
 */
export async function GET(req: NextRequest) {
  // Auth check
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev && cronSecret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const db = (await createClient()) as SupabaseClient<Database>;

  try {
    // Fetch ALL active sessions (paper, live, and copy trading)
    const { data: sessions, error } = await db
      .from("trading_sessions")
      .select("*")
      .eq("status", "active")
      .order("last_tick_at", { ascending: true, nullsFirst: true })
      .limit(50);

    if (error) {
      console.error("Failed to fetch sessions:", error);
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 },
      );
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ processed: 0, message: "No active sessions" });
    }

    // Fetch user risk configs in one query to avoid N+1
    const userIds = [...new Set(sessions.map((s) => s.user_id))];
    const { data: autoSettings } = await db
      .from("auto_trade_settings")
      .select("user_id, risk_profile, max_position_percent")
      .in("user_id", userIds);

    const riskConfigMap = new Map<string, RiskConfig>();
    for (const setting of autoSettings || []) {
      const maxPos = (setting.max_position_percent as number) ?? 10;
      riskConfigMap.set(setting.user_id as string, {
        maxPositionSizePercent: maxPos,
        stopLossPercent: 1,
        trailingStopLossPercent: 1.5,
        maxDailyLossPercent: 5,
        maxDailyTrades: 10,
        maxDrawdownPercent: 15,
        maxLeverage: 1,
      });
    }

    const results: TickResult[] = [];

    for (const session of sessions as unknown as TradingSession[]) {
      // Timeout protection
      if (Date.now() - startTime > 55_000) {
        console.warn(
          `Cron tick timeout approaching, processed ${results.length}/${sessions.length}`,
        );
        break;
      }

      try {
        const result = await processSession(db, session, riskConfigMap.get(session.user_id));
        results.push(result);

        // If this was a real trade (not hold/heartbeat), mirror to copy sessions
        if (
          (result.action === "buy" || result.action === "sell") &&
          result.trade_id
        ) {
          const { data: trade } = await db
            .from("trades")
            .select("*")
            .eq("id", result.trade_id)
            .single();

          if (trade) {
            await mirrorTradeToFollowers(db, session.id, trade);
          }
        }
      } catch (err) {
        const errorMessage = (err as Error).message;
        console.error(`Error processing session ${session.id}:`, errorMessage);
        results.push({
          session_id: session.id,
          action: "error",
          error: errorMessage,
        });
      }
    }

    const summary = {
      processed: results.length,
      total_active: sessions.length,
      trades_executed: results.filter(
        (r) => r.action === "buy" || r.action === "sell",
      ).length,
      risk_blocked: results.filter((r) => r.action === "risk_blocked").length,
      errors: results.filter((r) => r.action === "error").length,
      heartbeats: results.filter((r) => r.action === "heartbeat").length,
      duration_ms: Date.now() - startTime,
      results,
    };

    // Log summary to Sentry if there are issues
    if (summary.errors > 0 || summary.risk_blocked > 0) {
      console.info("Cron tick summary:", summary);
    }

    await captureCronSuccess("tick", new Date(startTime), new Date());

    return NextResponse.json(summary);
  } catch (err) {
    const errorMessage = (err as Error).message;
    console.error("Cron tick unexpected error:", err);
    captureCronError("tick", err as Error, { durationMs: Date.now() - startTime });

    return NextResponse.json(
      { error: "Internal error", details: errorMessage },
      { status: 500 },
    );
  }
}

// Also support POST for manual triggering
export const POST = GET;
