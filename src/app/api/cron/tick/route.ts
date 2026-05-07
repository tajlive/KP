/**
 * CRON TICK ENGINE - Unified Trading System
 * Processes ALL trading sessions with integrated Risk Management
 *
 * CRITICAL: Every trade MUST pass RiskManager.canExecuteTrade() BEFORE execution
 */

import { RiskConfig, RiskManager } from "@/lib/auto-trading/risk-manager";
import { resolveTickStrategyEngineKey, getStrategyConfig, shouldUseDarkFleet, getDarkFleetConfig } from "@/lib/trading/strategy-id-aliases";
import { buildTradeReason, buildIndicatorSnapshot, resolveStrategyKey } from "@/lib/trading/build-trade-reason";
import { div, mul } from "@/lib/decimal";
import { createClient } from "@/lib/supabase/server";
import { captureCronError, captureCronSuccess, generateTradeIdempotencyKey } from "@/lib/cron/cron-helpers";
import { ExecutorFactory } from "@/lib/trading/executor-factory";
import type { TradeSide, TradingSession } from "@/types/trading";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import {
  createLedger, addLot, sellFIFO, getWeightedEntryPrice,
  getTotalQuantity, migrateFromLegacy, toLegacyPosition,
  type LedgerState,
} from "@/lib/trading/position-ledger";
import { resolveStrategy, type Candle, type StrategySignal } from "@/lib/trading/strategies";
import { sma } from "@/lib/trading/strategies/indicators";
import { logger } from "@/lib/logger";
import { evaluateDarkFleetSignal, type DarkFleetConfig } from "@/lib/trading/regime/tick-adapter";
import { getFlagsAsync } from "@/lib/flags";
// Rollout framework available for future A/B testing:
// import { shouldUseChallenger, type TradeVersion } from "@/lib/trading/rollout/tick-rollout";
import { evaluateGuardrails, pauseUserSessions, DEFAULT_GUARDRAIL_CONFIG } from "@/lib/trading/beta/tick-guardrails";
import { queueEmail } from "@/lib/email";
import { calculateDynamicPositionSize } from "@/lib/trading/optimal/position-size";
import { applyMultiTimeframeFilter } from "@/lib/trading/multi-timeframe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// maxDuration arves fra vercel.json (300s) — overstyr ikke her

interface TickResult {
  session_id: string;
  action: "buy" | "sell" | "hold" | "error" | "heartbeat" | "risk_blocked" | "live_trade_failed";
  error?: string;
  trade_id?: string;
  risk_reason?: string;
}

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
 * Execute a live trade on Binance using user's API keys.
 * Uses ExecutorFactory for consistent key decryption and tier validation.
 * Returns null if anything fails — live trades must NEVER silently fall back.
 */
async function executeLiveTrade(
  db: SupabaseClient<Database>,
  userId: string,
  pair: string,
  side: 'buy' | 'sell',
  quantity: number,
): Promise<{ executedPrice: number; binanceOrderId: string; fee: number } | null> {
  try {
    // 1. Validate user can trade live (tier + connected)
    const canTrade = await ExecutorFactory.canTradeLive(db, userId);
    if (!canTrade) {
      console.warn(`[LiveTrade] User ${userId} not authorized for live trading`);
      return null;
    }

    // 2. Create executor via factory (handles key decryption)
    const executor = await ExecutorFactory.create(db, userId, 'live');

    // 3. Execute on Binance
    const binanceSymbol = pair.replace('/', '');
    const result = await executor.executeOrder({
      symbol: binanceSymbol,
      side,
      quantity,
      orderType: 'market',
    });

    if (!result.success) {
      console.error(`[LiveTrade] Binance order failed for user ${userId}:`, result.error);
      return null;
    }
    return {
      executedPrice: result.executedPrice,
      binanceOrderId: result.orderId,
      fee: result.fee,
    };
  } catch (err) {
    console.error(`[LiveTrade] Unexpected error for user ${userId}:`, err);
    return null;
  }
}

/**
 * CRITICAL: Process session with Risk Management
 */
async function processSession(
  db: SupabaseClient<Database>,
  session: TradingSession,
  userRiskConfig?: RiskConfig,
  preFetchedCandles?: Candle[],
  darkFleetBaseConfig?: DarkFleetConfig,
  preFetchedCandles4h?: Candle[],
  preFetchedCandles15m?: Candle[],
): Promise<TickResult> {
  const engineKey = resolveTickStrategyEngineKey(session.strategy_id);
  const pair = session.trading_pair || "BTCUSDT";
  // OPTIMIZATION: Use pre-fetched candles if available, else fetch individually
  const candles = preFetchedCandles ?? await fetchCandles(pair, "1h", 100);
  const currentPrice = candles[candles.length - 1].close;

  // ── V2: Load per-strategy config (UUID-aware) ───────────────────────────
  const strategyConfig = getStrategyConfig(session.strategy_id);
  const resolvedEngine = strategyConfig?.engine ?? engineKey ?? "multi_signal";
  const baseConfig = strategyConfig?.config ?? {};
  // Merge: per-UUID config overrides session.strategy_config
  const mergedConfig: Record<string, unknown> = {
    ...session.strategy_config,
    ...baseConfig,
    engineKey: resolvedEngine,
  };

  let signal: StrategySignal;

  // ── PATH C: Dark Fleet (regime-aware ensemble) ──────────────────────────
  // V2: Dark Fleet is always enabled in production. Per-strategy config overrides global.
  const perStrategyDF = getDarkFleetConfig(session.strategy_id);
  const dfEnabled = perStrategyDF?.enabled ?? darkFleetBaseConfig?.enabled ?? true;

  let darkFleetConfig: DarkFleetConfig | undefined;
  if (dfEnabled && resolvedEngine !== "ensemble_ai") {
    darkFleetConfig = { ...darkFleetBaseConfig, ...perStrategyDF } as DarkFleetConfig;
  }
  const useDarkFleet = !!darkFleetConfig;
  if (useDarkFleet) {
    try {
      signal = evaluateDarkFleetSignal(
        {
          candles,
          session,
          config: mergedConfig,
        },
        darkFleetConfig,
      );
    } catch (err) {
      console.error(`[DarkFleet] Error for session ${session.id}:`, (err as Error).message);
      // Fallback to V2
      const fallbackStrategy = resolvedEngine ? resolveStrategy(resolvedEngine) : undefined;
      if (fallbackStrategy) {
        signal = fallbackStrategy.evaluate({
          candles,
          session,
          config: mergedConfig,
        });
      } else {
        return {
          session_id: session.id,
          action: "error",
          error: `Dark Fleet fallback failed for strategy: ${session.strategy_id}`,
        };
      }
    }
  } else if (resolvedEngine === "ensemble_ai") {
    // === PATH A: Eksisterende ensemble_ai (uendret) ===
    const symbol = pair.replace("/", "");
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
        positionSize: (mergedConfig.position_size as number) ?? 0.05,
        indicators: { source: "ensemble_ai", confidence: aiSignal.confidence },
        reason: aiSignal.reasoning || "Ensemble AI signal",
      };
    } else {
      signal = { action: "hold", reason: "No recent ensemble AI signal" };
    }
  } else {
    // === PATH B: V2 strategies with merged config ===
    const strategy = resolvedEngine ? resolveStrategy(resolvedEngine) : undefined;
    if (!strategy) {
      console.error(`[Tick] Unknown strategy for session ${session.id}: "${session.strategy_id}" (engine: ${resolvedEngine}) — skipping`);
      return {
        session_id: session.id,
        action: "error",
        error: `Unknown strategy: ${session.strategy_id}`,
      };
    }
    signal = strategy.evaluate({
      candles,
      session,
      config: mergedConfig,
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
        ?.trailing_stop_pct as number) ?? 2.5;

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

    // Time-based exit: Sell after 7 days if position is not profitable
    const entryTime = new Date(session.open_position.entry_time).getTime();
    const daysInPosition = (Date.now() - entryTime) / (1000 * 60 * 60 * 24);
    const timeExitDays = ((session.strategy_config as Record<string, unknown>)?.time_exit_days as number) ?? 7;
    if (daysInPosition >= timeExitDays && currentPrice <= entryPrice) {
      signal.action = "sell";
      signal.reason = `Time-based exit: position held ${daysInPosition.toFixed(1)} days without profit — cutting loss`;
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

  // ── V2: Multi-Timeframe Filter (4h trend + 1h signal + 15m entry) ──────
  if (preFetchedCandles4h && preFetchedCandles15m && signal.action !== "hold") {
    const mtfResult = applyMultiTimeframeFilter(
      candles,
      preFetchedCandles4h,
      preFetchedCandles15m,
      signal.action,
      signal.indicators?.confidence ? (signal.indicators.confidence as number) / 3 : 0.8,
      { strategyKey: resolvedEngine, trendThreshold: 0.5, entryThreshold: 0.7 },
    );

    logger.debug(`[MTF] Session ${session.id}: score=${mtfResult.score} trend=${mtfResult.trendDirection}(${mtfResult.trendScore}) entry=${mtfResult.entryConfirm} passed=${mtfResult.passed}`);

    if (!mtfResult.passed) {
      signal = {
        action: "hold",
        reason: `MTF blocked: ${mtfResult.reason}`,
        indicators: {
          ...signal.indicators,
          mtf_blocked: true,
          mtf_score: mtfResult.score,
          mtf_trend_score: mtfResult.trendScore,
          mtf_entry_score: mtfResult.entryConfirm,
          mtf_trend_direction: mtfResult.trendDirection,
        },
      };
    } else {
      // Enrich signal with MTF context
      signal.indicators = {
        ...signal.indicators,
        mtf_score: mtfResult.score,
        mtf_trend_score: mtfResult.trendScore,
        mtf_entry_score: mtfResult.entryConfirm,
        mtf_trend_direction: mtfResult.trendDirection,
      };
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
  let riskConfig: RiskConfig = userRiskConfig || (stratCfg.risk_config as RiskConfig) || DEFAULTS;

  // Grid strategy needs more trades per day — apply multiplier based on grid levels
  if (engineKey === "grid") {
    const gridCfg = (stratCfg.grid_config as Record<string, number> | undefined);
    const gridLevels = gridCfg?.levels ?? 10;
    // Grid needs at least 2 trades per level (buy + sell) per day
    const gridMinTrades = gridLevels * 2;
    if (riskConfig.maxDailyTrades < gridMinTrades) {
      console.warn(`[Grid] Session ${session.id}: maxDailyTrades (${riskConfig.maxDailyTrades}) < gridMinTrades (${gridMinTrades}). Raising limit.`);
      riskConfig = { ...riskConfig, maxDailyTrades: gridMinTrades };
    }
  }

  if (engineKey === "grid" && signal.positionSize) {
    const maxGridPos = riskConfig.maxPositionSizePercent / 100;
    signal.positionSize = Math.min(signal.positionSize, maxGridPos);
  }

  // ── V2: Dynamic Position Sizing (Kelly + ATR + Regime + Drawdown) ──────
  let positionSize = signal.positionSize ?? 0.1;
  let positionSizeReason = "static fallback";
  let kellyFraction: number | undefined;
  const regime = (signal.indicators?.regime as string) ?? "unknown";

  if (signal.action === "buy" || signal.action === "sell") {
    try {
      const dynamicSize = await calculateDynamicPositionSize(db, {
        userId: session.user_id,
        sessionId: session.id,
        strategyId: session.strategy_id,
        currentCapital: session.current_capital,
        initialCapital: session.initial_capital,
        candles,
        regime,
        signalAction: signal.action,
        basePositionSize: positionSize,
        riskProfile: "balanced",
      });
      positionSize = dynamicSize.positionSize;
      positionSizeReason = dynamicSize.reason;
      kellyFraction = dynamicSize.kellyFraction;
      logger.debug(`[PositionSize] Session ${session.id}: ${(positionSize * 100).toFixed(2)}% (${dynamicSize.reason})`);
    } catch (err) {
      logger.warn(`[PositionSize] Failed for session ${session.id}, using fallback:`, (err as Error).message);
    }
  }

  const tradeAmount = session.current_capital * positionSize;

  // Minimum order value ($10) — same for paper and live
  if (tradeAmount < 10) {
    return { session_id: session.id, action: "hold" };
  }

  // Apply slippage (0.05%) — same for paper and live
  const slippage = 0.0005;
  const executedPrice = signal.action === "buy"
    ? mul(currentPrice, 1 + slippage)
    : mul(currentPrice, 1 - slippage);

  const quantity = div(tradeAmount, executedPrice);

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

  // ─── BETA GUARDRAILS ─────────────────────────────────────────────────
  const isBetaUser = process.env.BETA_USER_IDS?.split(",").includes(session.user_id) || false;
  if (isBetaUser) {
    const guardrails = await evaluateGuardrails(
      db,
      session.user_id,
      session.current_capital,
      session.initial_capital,
      DEFAULT_GUARDRAIL_CONFIG,
    );

    if (!guardrails.allowed) {
      console.warn(`[Guardrails] User ${session.user_id} blocked: ${guardrails.reason}`);

      if (guardrails.action === "pause" || guardrails.action === "kill") {
        await pauseUserSessions(db, session.user_id, guardrails.reason || "Guardrail triggered");
      }

      return {
        session_id: session.id,
        action: "risk_blocked",
        risk_reason: guardrails.reason,
      };
    }

    if (guardrails.action === "warn") {
      console.warn(`[Guardrails] Warning for ${session.user_id}: ${guardrails.reason}`);
    }
  }
  // ─────────────────────────────────────────────────────────────────────

  // Calculate stop loss
  const stopLossPrice = riskManager.calculateStopLoss({
    entryPrice: currentPrice,
    direction: signal.action === "buy" ? "LONG" : "SHORT",
  });

  // ─── LIVE TRADING EXECUTION ──────────────────────────────────────────
  let liveResult: { executedPrice: number; binanceOrderId: string; fee: number } | null = null;
  if (session.mode === "live") {
    liveResult = await executeLiveTrade(db, session.user_id, pair, signal.action as 'buy' | 'sell', quantity);

    if (!liveResult) {
      console.warn(`[Tick] Live trade blocked for session ${session.id}: Binance execution failed`);

      // Log failure to trading_logs so user sees it
      await db.from("trading_logs").insert({
        session_id: session.id,
        user_id: session.user_id,
        action: "live_trade_failed",
        details: { reason: "Binance execution failed", signal: signal.action, requested_amount: tradeAmount } as never,
      } as never);

      return {
        session_id: session.id,
        action: "live_trade_failed",
        risk_reason: "Binance execution failed",
      };
    }
  }
  // ─────────────────────────────────────────────────────────────────────

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
  // For live mode, use Binance actuals; for paper, use simulated
  const finalExecutedPrice = liveResult ? liveResult.executedPrice : executedPrice;
  const finalFee = liveResult ? liveResult.fee : mul(mul(quantity, executedPrice), 0.001);
  const totalValue = mul(quantity, finalExecutedPrice);
  const idempotencyKey = generateTradeIdempotencyKey(session.id, pair, signal.action);

  const { data: trade, error: tradeError } = await db
    .from("trades")
    .insert({
      session_id: session.id,
      user_id: session.user_id,
      idempotency_key: idempotencyKey,
      mode: session.mode,
      trading_pair: session.trading_pair,
      symbol: pair.replace("/", ""),
      side: signal.action as TradeSide,
      order_type: "market",
      quantity,
      price: finalExecutedPrice,
      total_value: totalValue,
      fee: finalFee,
      status: "filled",
      realized_pnl: realizedPnl,
      binance_order_id: liveResult?.binanceOrderId ?? null,
      strategy_signal: {
        ...signal.indicators,
        stop_loss: stopLossPrice,
        position_size: Math.round(positionSize * 10000) / 10000,
        position_size_reason: positionSizeReason,
        kelly_fraction: kellyFraction ?? null,
      },
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

    // For live trades, use actual Binance executed price as cost basis
    const entryPriceForLot = liveResult ? liveResult.executedPrice : executedPrice;
    const updatedLedger = addLot(ledger, quantity, entryPriceForLot);
    const legacyPos = toLegacyPosition(updatedLedger);

    if (legacyPos) {
      await db
        .from("trading_sessions")
        .update({
          open_position: {
            ...legacyPos,
            highest_price: session.open_position?.highest_price ?? entryPriceForLot,
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

  // Log Dark Fleet / regime metadata for every trade
  if (signal.action === "buy" || signal.action === "sell") {
    try {
      await db.from("trading_logs").insert({
        session_id: session.id,
        user_id: session.user_id,
        action: "regime_signal",
        details: {
          trade_id: trade?.id,
          regime: signal.indicators?.regime ?? "unknown",
          ensemble_score: signal.indicators?.ensembleScore ?? null,
          dark_fleet: useDarkFleet,
          engine: resolvedEngine,
          strategy_id: session.strategy_id,
        } as never,
      } as never);
    } catch {
      // Non-critical: don't fail the tick if logging fails
    }
  }

  // Log successful trade
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
        fee: mul(followerTradeAmount, 0.001),
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

  // Dark Fleet feature flags (hetes en gang per cron-run)
  const flags = await getFlagsAsync().catch(() => ({ darkFleetPhase1: false, darkFleetKillSwitch: false }));
  const darkFleetBaseConfig: DarkFleetConfig | undefined = flags.darkFleetPhase1 && !flags.darkFleetKillSwitch
    ? {
        enabled: true,
        technicalWeight: parseFloat(process.env.DARK_FLEET_TECH_WEIGHT || "0.5"),
        narrativeWeight: parseFloat(process.env.DARK_FLEET_NARRATIVE_WEIGHT || "0.25"),
        regimeWeight: parseFloat(process.env.DARK_FLEET_REGIME_WEIGHT || "0.25"),
        threshold: parseFloat(process.env.DARK_FLEET_THRESHOLD || "0.3"),
        maxPositionSize: parseFloat(process.env.DARK_FLEET_MAX_POSITION || "0.12"),
      }
    : undefined;

  try {
    // Fetch ALL active sessions (paper, live, and copy trading)
    // Increased from 50 → 500 to avoid starving sessions when many users are active
    const { data: sessions, error } = await db
      .from("trading_sessions")
      .select("*")
      .eq("status", "active")
      .order("last_tick_at", { ascending: true, nullsFirst: true })
      .limit(500);

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

    // Portfolio-level circuit breaker: stop ALL trading if user's paper balance
    // has dropped 15% or more from initial across all sessions (was 5%, too aggressive)
    const userPortfolioMap = new Map<string, { initial: number; current: number }>();
    for (const s of sessions) {
      const existing = userPortfolioMap.get(s.user_id) || { initial: 0, current: 0 };
      existing.initial += s.initial_capital;
      existing.current += s.current_capital;
      userPortfolioMap.set(s.user_id, existing);
    }

    for (const [userId, portfolio] of userPortfolioMap) {
      const drawdown = ((portfolio.initial - portfolio.current) / portfolio.initial) * 100;
      if (drawdown >= 15) {
        console.warn(`[PORTFOLIO STOP] User ${userId}: drawdown ${drawdown.toFixed(2)}% ≥ 15%. Stopping ALL sessions.`);
        await db.from("trading_logs").insert({
          user_id: userId,
          action: "portfolio_stop",
          details: { drawdown, initial: portfolio.initial, current: portfolio.current, reason: "Portfolio drawdown ≥ 15%" } as never,
        } as never);
        // Stop all sessions for this user with reason
        const { data: stoppedSessions } = await db.from("trading_sessions")
          .update({ status: "stopped", last_status_message: `Circuit breaker: portfolio drawdown ${drawdown.toFixed(1)}%` })
          .eq("user_id", userId)
          .eq("status", "active")
          .select("id");

        // Notify user via email
        try {
          const sessionsStopped = stoppedSessions?.length ?? 0;
          await queueEmail({
            userId,
            type: "circuit_breaker",
            data: {
              name: "",
              drawdown: `${drawdown.toFixed(1)}%`,
              sessionsStopped,
              portfolioValue: `${portfolio.current.toLocaleString("no-NO")} NOK`,
              restartUrl: `https://www.klarpakke.no/no/dashboard/portfolio`,
            },
          });
        } catch (notifyErr) {
          console.error(`[PORTFOLIO STOP] Failed to email user ${userId}:`, notifyErr);
        }

        // Notify user via push notification
        try {
          const cronSecret = process.env.CRON_SECRET;
          if (cronSecret) {
            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "https://www.klarpakke.no"}/api/notifications/send`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${cronSecret}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userIds: [userId],
                notification: {
                  title: "⚠️ Trading stoppet",
                  body: `Portfolio drawdown ${drawdown.toFixed(1)}%. ${stoppedSessions?.length ?? 0} session(s) stoppet.`,
                  url: "/no/dashboard/portfolio",
                  requireInteraction: true,
                },
              }),
            });
          }
        } catch (pushErr) {
          console.error(`[PORTFOLIO STOP] Failed to push notify user ${userId}:`, pushErr);
        }
      }
    }

    // Fetch user risk configs in one query to avoid N+1
    const userIds = [...new Set(sessions.map((s) => s.user_id))];
    const { data: autoSettings } = await db
      .from("auto_trade_settings")
      .select("user_id, risk_profile, max_position_percent, daily_loss_limit_percent, daily_trade_limit")
      .in("user_id", userIds);

    const riskConfigMap = new Map<string, RiskConfig>();
    for (const setting of autoSettings || []) {
      const maxPos = (setting.max_position_percent as number) ?? 10;
      const dailyLoss = (setting.daily_loss_limit_percent as number) ?? 5;
      const dailyTrades = (setting.daily_trade_limit as number) ?? 10;
      riskConfigMap.set(setting.user_id as string, {
        maxPositionSizePercent: maxPos,
        stopLossPercent: 1,
        trailingStopLossPercent: 1.5,
        maxDailyLossPercent: dailyLoss,
        maxDailyTrades: dailyTrades,
        maxDrawdownPercent: 15,
        maxLeverage: 1,
      });
    }

    // OPTIMIZATION 1: Pre-fetch candles for all unique symbols (1h + 4h + 15m)
    const uniqueSymbols = new Map<string, Candle[]>();
    const uniqueSymbols4h = new Map<string, Candle[]>();
    const uniqueSymbols15m = new Map<string, Candle[]>();
    const symbolList = [...new Set(sessions.map((s) => s.trading_pair?.replace("/", "") || "BTCUSDT"))];
    
    await Promise.all(
      symbolList.map(async (symbol) => {
        try {
          const [candles1h, candles4h, candles15m] = await Promise.all([
            fetchCandles(symbol, "1h", 100),
            fetchCandles(symbol, "4h", 50),
            fetchCandles(symbol, "15m", 100),
          ]);
          uniqueSymbols.set(symbol, candles1h);
          uniqueSymbols4h.set(symbol, candles4h);
          uniqueSymbols15m.set(symbol, candles15m);
        } catch (err) {
          console.error(`[Tick] Failed to fetch candles for ${symbol}:`, err);
        }
      }),
    );
    const results: TickResult[] = [];

    for (const session of sessions as unknown as TradingSession[]) {
      // Skip manual sessions — these are user-driven and not processed by auto-trading cron
      if (session.strategy_id === "manual") {
        results.push({ session_id: session.id, action: "heartbeat" });
        continue;
      }

      // Timeout protection
      if (Date.now() - startTime > 55_000) {
        console.warn(
          `Cron tick timeout approaching, processed ${results.length}/${sessions.length}`,
        );
        break;
      }

      try {
        const symbolKey = session.trading_pair?.replace("/", "") || "BTCUSDT";
        const result = await processSession(
          db,
          session,
          riskConfigMap.get(session.user_id),
          uniqueSymbols.get(symbolKey),
          darkFleetBaseConfig,
          uniqueSymbols4h.get(symbolKey),
          uniqueSymbols15m.get(symbolKey),
        );
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
