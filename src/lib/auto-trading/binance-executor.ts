/**
 * Auto-Trading Binance Executor
 * Executes trading signals on Binance with full risk management
 * Includes referral tracking for tomarnejensen@gmail.com
 */

import { createClient } from "@/lib/utils";
import { getKlines } from "../binance";
import {
  OPTIMIZED_PROFILES,
  type RiskLevel,
} from "../config/optimized-risk-profiles";
import { analyzeCurrentMarket } from "./market-regime";
import { assessTradeRisk, calculateTradeFeatures } from "./ml-risk-assessment";
import { checkNewTradeCorrelation } from "./portfolio-optimizer";
import {
  CIRCUIT_BREAKER_DEFAULTS,
  calculateKellyPositionSize,
  checkCircuitBreakers,
} from "./risk-management";
import { copyTrade } from "./social-trading";
import { createStrategy } from "./strategies";
import type {
  AutoTradingStrategy,
  AutoTradingTrade,
  TradingSignal,
  UserAutoTradingConfig,
} from "./types";
// Production Observability Logger
const logger = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.info(`[BOT:INFO] ${msg}`, JSON.stringify(meta)),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(`[BOT:WARN] ${msg}`, JSON.stringify(meta)),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(`[BOT:ERROR] ${msg}`, JSON.stringify(meta)),
  metric: (name: string, value: number, tags?: Record<string, string>) =>
    console.info(`[METRIC] ${name}:${value}`, JSON.stringify(tags || {})),
};

// Binance Referral Configuration
export const BINANCE_REFERRAL = {
  code: "43427892", // Your referral code
  link: "https://accounts.binance.com/register?ref=43427892",
  commissionRate: 0.1, // 10% commission on trades
  benefits: {
    user: "20% fee discount",
    referrer: "Commission on trading fees",
  },
};

interface BinanceCredentials {
  apiKey: string;
  apiSecret: string;
  isTestnet?: boolean;
}

interface ExecuteTradeParams {
  userId: string;
  sessionId: string;
  signal: TradingSignal;
  config: UserAutoTradingConfig;
  credentials: BinanceCredentials;
}

interface TradeExecutionResult {
  success: boolean;
  trade?: AutoTradingTrade;
  binanceOrderId?: string;
  error?: string;
  warnings: string[];
}

// Database types matching the actual schema
interface AutoTradingSessionRow {
  id: string;
  user_id: string;
  config_id: string;
  strategy_name: string;
  is_paper_trading: boolean;
  phase: string;
  starting_capital_nok: number;
  current_capital_nok: number;
  allocated_capital_pct: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_pnl_nok: number;
  total_pnl_pct: number;
  max_drawdown_pct: number;
  status: string;
  pause_reason: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AutoTradingTradeRow {
  id: string;
  session_id: string;
  user_id: string;
  symbol: string;
  side: string;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  position_value_nok: number;
  leverage: number;
  stop_loss_price: number | null;
  take_profit_price: number | null;
  stop_loss_pct: number | null;
  pnl_nok: number | null;
  pnl_pct: number | null;
  fees_nok: number;
  status: string;
  close_reason: string | null;
  risk_score: number | null;
  market_volatility_pct: number | null;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
}

interface UserAutoTradingConfigRow {
  id: string;
  user_id: string;
  strategy_id: string;
  is_enabled: boolean;
  is_paper_trading: boolean;
  trading_capital_nok: number;
  phase: string;
  phase_started_at: string;
  phase_min_days: number;
  phase_profitable: boolean;
  allocated_capital_pct: number;
  custom_params: Record<string, unknown> | null;
  override_stop_loss_pct: number | null;
  override_daily_loss_limit_pct: number | null;
  override_max_trades_per_day: number | null;
  auto_extract_profit_enabled: boolean;
  auto_extract_profit_threshold_pct: number;
  auto_extract_profit_amount_pct: number;
  created_at: string;
  updated_at: string;
  last_trade_at: string | null;
}

/**
 * Main trade execution engine
 * Combines all protection layers before executing
 */
export async function executeTrade(
  params: ExecuteTradeParams,
): Promise<TradeExecutionResult> {
  const {
    userId,
    sessionId,
    signal,
    config,
    credentials: _credentials,
  } = params;
  const warnings: string[] = [];
  const startTime = Date.now();

  try {
    const supabase: unknown = createClient();

    // =========================================================================
    // LAYER 1: Check if auto-trading is enabled for this user
    // =========================================================================
    const { data: session } = await (supabase as unknown)
      .from("auto_trading_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    const sessionRow = session as AutoTradingSessionRow | null;

    if (!sessionRow || sessionRow.status !== "active") {
      return {
        success: false,
        error: "Auto-trading is not active",
        warnings,
      };
    }

    // =========================================================================
    // LAYER 2: Market Regime Check
    // =========================================================================
    const marketAnalysis = await analyzeCurrentMarket(signal.symbol);
    if (!marketAnalysis.recommendation.shouldTrade) {
      return {
        success: false,
        error: `Trading blocked: ${marketAnalysis.recommendation.reason}`,
        warnings,
      };
    }
    logger.metric("market_regime_check_passed", 1, {
      symbol: signal.symbol,
      regime: marketAnalysis.regime,
    });

    // =========================================================================
    // LAYER 3: Circuit Breaker Check
    // =========================================================================
    // TODO: auto_trading_trades table missing in types - needs migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: todaysTrades } = await (supabase as any)
      .from("auto_trading_trades")
      .select("*")
      .eq("session_id", sessionId)
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: weeksTrades } = await (supabase as any)
      .from("auto_trading_trades")
      .select("*")
      .eq("session_id", sessionId)
      .gte(
        "created_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      );

    const circuitBreakerConfig =
      CIRCUIT_BREAKER_DEFAULTS[config.risk_level || "balanced"];

    // Calculate consecutive losses
    const todaysTradesRows = (todaysTrades || []) as AutoTradingTradeRow[];
    const recentClosedTrades = todaysTradesRows
      .filter((t) => t.status === "CLOSED")
      .sort(
        (a, b) =>
          new Date(b.closed_at ?? 0).getTime() -
          new Date(a.closed_at ?? 0).getTime(),
      );

    let consecutiveLosses = 0;
    for (const trade of recentClosedTrades) {
      if ((trade.pnl_nok ?? 0) < 0) consecutiveLosses++;
      else break;
    }

    // Calculate current drawdown
    const peakBalance = sessionRow.current_capital_nok; // Schema doesn't have peak_balance, use current
    const currentDrawdown = 0; // Cannot calculate without peak_balance

    // Create minimal strategy object for circuit breaker
    const strategyForCircuitBreaker: Partial<AutoTradingStrategy> = {
      risk_level: config.risk_level || "balanced",
    };

    const circuitCheck = checkCircuitBreakers({
      userId,
      sessionId,
      strategy: strategyForCircuitBreaker as AutoTradingStrategy,
      config,
      circuitBreaker: circuitBreakerConfig,
      currentPortfolioValue: sessionRow.current_capital_nok,
      todaysTrades: (todaysTrades || []) as AutoTradingTrade[],
      weeksTrades: (weeksTrades || []) as AutoTradingTrade[],
      allTrades: [],
      consecutiveLosses,
      currentDrawdown,
    });

    if (!circuitCheck.passed) {
      // Pause session if circuit breaker triggered
      if (circuitCheck.level === "daily" || circuitCheck.level === "strategy") {
        await (supabase as unknown)
          .from("auto_trading_sessions")
          .update({
            status: "paused",
            pause_reason: circuitCheck.triggered,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionId);
      }

      return {
        success: false,
        error: circuitCheck.reason,
        warnings,
      };
    }
    logger.metric("circuit_breaker_passed", 1, {
      userId,
      level: circuitCheck.level || "none",
    });

    // =========================================================================
    // LAYER 4: ML Risk Assessment
    // =========================================================================
    const tradeFeatures = calculateTradeFeatures(
      signal.symbol,
      signal,
      (todaysTrades || []) as AutoTradingTrade[],
    );
    const riskAssessment = assessTradeRisk(signal, tradeFeatures);

    if (!riskAssessment.shouldTrade) {
      return {
        success: false,
        error: riskAssessment.reason,
        warnings,
      };
    }

    if (riskAssessment.riskScore > 70) {
      warnings.push(
        `Høy risiko-score: ${riskAssessment.riskScore.toFixed(0)}/100`,
      );
    }

    // =========================================================================
    // LAYER 4.5: Correlation Check
    // =========================================================================
    const { data: openPositions } = await (supabase as unknown)
      .from("auto_trading_trades")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "OPEN");

    const correlationCheck = checkNewTradeCorrelation(
      signal.symbol,
      (openPositions || []) as AutoTradingTrade[],
      config.risk_level || "balanced",
    );

    if (!correlationCheck.allowed) {
      return {
        success: false,
        error: correlationCheck.reason,
        warnings,
      };
    }

    // =========================================================================
    // LAYER 5: Position Sizing (Kelly Criterion)
    // =========================================================================
    const historicalTrades = await (supabase as unknown)
      .from("auto_trading_trades")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "CLOSED")
      .limit(50);

    const closedTrades = (historicalTrades.data || []) as AutoTradingTrade[];
    const winningTrades = closedTrades.filter((t) => (t.pnl_nok ?? 0) > 0);

    const winRate =
      closedTrades.length > 0
        ? winningTrades.length / closedTrades.length
        : 0.5;
    const avgWin =
      winningTrades.length > 0
        ? winningTrades.reduce(
            (sum, t) => sum + (t.pnl_nok ?? 0) / (t.position_value_nok || 1),
            0,
          ) / winningTrades.length
        : 0.05;
    const avgLoss =
      closedTrades.length > winningTrades.length
        ? closedTrades
            .filter((t) => (t.pnl_nok ?? 0) <= 0)
            .reduce(
              (sum, t) =>
                sum + Math.abs((t.pnl_nok ?? 0) / (t.position_value_nok || 1)),
              0,
            ) /
          (closedTrades.length - winningTrades.length)
        : 0.03;

    const positionSize = calculateKellyPositionSize({
      winRate,
      avgWin,
      avgLoss,
      confidence: signal.confidence * riskAssessment.confidence,
      marketRegime: marketAnalysis.regime,
      portfolioValue: sessionRow.current_capital_nok,
      riskTolerance:
        OPTIMIZED_PROFILES[(config.risk_level as RiskLevel) || "moderate"]
          ?.kellyFraction || 0.5,
    });

    // Apply position size limit from config
    const maxPositionValue = Math.min(
      positionSize.dollarAmount,
      sessionRow.current_capital_nok * ((config.max_position_size || 10) / 100),
      (config.max_capital || 1000) * 0.1, // Max 10% of max capital per trade
    );

    if (maxPositionValue < 10) {
      return {
        success: false,
        error: "Posisjonsstørrelse for liten (min $10)",
        warnings,
      };
    }

    // =========================================================================
    // LAYER 6: Execute on Binance
    // =========================================================================
    const currentPrice = signal.entry_price;
    const quantity = maxPositionValue / currentPrice;

    // Round quantity to valid lot size (Binance requirement)
    const symbolInfo = await getSymbolInfo(signal.symbol);
    const roundedQuantity = roundToStepSize(quantity, symbolInfo.stepSize);

    if (roundedQuantity < symbolInfo.minQty) {
      return {
        success: false,
        error: `Minimum quantity for ${signal.symbol} is ${symbolInfo.minQty}`,
        warnings,
      };
    }

    const executionStart = Date.now();
    // Place order via Edge Function
    const { data: orderResult, error: orderError } =
      await supabase.functions.invoke("place-binance-order", {
        body: {
          symbol: signal.symbol,
          side: signal.side,
          quantity: roundedQuantity,
          order_type: "MARKET",
          // Add referral tracking in metadata
          referral_code: BINANCE_REFERRAL.code,
        },
      });

    const executionEnd = Date.now();
    logger.metric("binance_api_latency_ms", executionEnd - executionStart, {
      symbol: signal.symbol,
    });

    if (orderError || !orderResult?.success) {
      throw new Error(
        orderError?.message || orderResult?.error || "Order failed",
      );
    }

    // =========================================================================
    // LAYER 7: Record Trade in Database
    // =========================================================================
    const stopLossPercent = circuitBreakerConfig.stopLossPercent;
    const takeProfitPercent = circuitBreakerConfig.takeProfitPercent;

    // Use signal's prices if provided, otherwise default to circuit breaker levels
    const stopLoss =
      signal.stop_loss_price ||
      (signal.side === "LONG"
        ? currentPrice * (1 - stopLossPercent)
        : currentPrice * (1 + stopLossPercent));

    const takeProfit =
      signal.take_profit_price ||
      (signal.side === "LONG"
        ? currentPrice * (1 + takeProfitPercent)
        : currentPrice * (1 - takeProfitPercent));

    const { data: trade, error: tradeError } = await (supabase as unknown)
      .from("auto_trading_trades")
      .insert({
        user_id: userId,
        session_id: sessionId,
        symbol: signal.symbol,
        side: signal.side,
        entry_price: currentPrice,
        quantity: roundedQuantity,
        position_value_nok: maxPositionValue,
        leverage: 1.0,
        stop_loss_price: stopLoss,
        take_profit_price: takeProfit,
        status: "OPEN",
      })
      .select()
      .single();

    if (tradeError) {
      console.error("Failed to record trade:", tradeError);
    }

    // Update session
    await (supabase as unknown)
      .from("auto_trading_sessions")
      .update({
        total_trades: (sessionRow.total_trades || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    const tradeRow = trade as AutoTradingTradeRow | null;

    // Create notification
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "trade_executed",
      title: `${signal.side} ${signal.symbol}`,
      message: `Posisjon åpnet: ${roundedQuantity} ${signal.symbol.replace("USDT", "")} @ $${currentPrice}`,
      related_id: tradeRow?.id,
      priority: "medium",
      read: false,
    });

    // Trigger social copy trading (async, don't await)
    if (tradeRow) {
      copyTrade(tradeRow as unknown as AutoTradingTrade).catch((err) =>
        console.error("Copy trading error:", err),
      );
    }

    return {
      success: true,
      trade: (tradeRow || undefined) as AutoTradingTrade | undefined,
      binanceOrderId: orderResult.order.orderId,
      warnings,
    };
  } catch (error: unknown) {
    const totalTime = Date.now() - startTime;
    logger.error("Trade execution failed", { userId, error, totalTime });
    logger.metric("trade_execution_failed", 1, { symbol: signal.symbol });
    console.error("Trade execution error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      warnings,
    };
  }
}

/**
 * Close a trade on Binance
 */
export async function closeTrade(
  trade: AutoTradingTrade,
  reason:
    | "STOP_LOSS"
    | "TAKE_PROFIT"
    | "TRAILING_STOP"
    | "MANUAL"
    | "STRATEGY_EXIT",
  _credentials: BinanceCredentials,
): Promise<{ success: boolean; error?: string; pnl?: number }> {
  try {
    const supabase: unknown = createClient();

    // Execute close order on Binance (opposite side)
    const closeSide = trade.side === "LONG" ? "SELL" : "BUY";

    const { data: orderResult, error: orderError } =
      await supabase.functions.invoke("place-binance-order", {
        body: {
          symbol: trade.symbol,
          side: closeSide,
          quantity: trade.quantity,
          order_type: "MARKET",
        },
      });

    if (orderError || !orderResult?.success) {
      throw new Error(orderError?.message || "Close order failed");
    }

    // Calculate PnL
    const exitPrice = parseFloat(
      orderResult.order.fills?.[0]?.price ??
        trade.current_price?.toString() ??
        "0",
    );
    const pnl =
      trade.side === "LONG"
        ? (exitPrice - trade.entry_price) * trade.quantity
        : (trade.entry_price - exitPrice) * trade.quantity;

    const pnlPercent = (pnl / (trade.position_value_nok || 1)) * 100;

    // Map reason to close_reason enum
    const closeReasonMap: Record<string, string> = {
      STOP_LOSS: "stop_loss",
      TAKE_PROFIT: "take_profit",
      TRAILING_STOP: "stop_loss",
      MANUAL: "manual",
      STRATEGY_EXIT: "manual",
    };

    // Update trade record
    await (supabase as unknown)
      .from("auto_trading_trades")
      .update({
        status: "CLOSED",
        exit_price: exitPrice,
        pnl_nok: pnl,
        pnl_pct: pnlPercent,
        closed_at: new Date().toISOString(),
        close_reason: closeReasonMap[reason] ?? "manual",
      })
      .eq("id", trade.id);

    // Update session balance
    const { data: session } = await (supabase as unknown)
      .from("auto_trading_sessions")
      .select("*")
      .eq("id", trade.session_id)
      .single();

    const sessionRow = session as AutoTradingSessionRow | null;

    if (sessionRow) {
      const newBalance = sessionRow.current_capital_nok + pnl;

      await (supabase as unknown)
        .from("auto_trading_sessions")
        .update({
          current_capital_nok: newBalance,
          total_pnl_nok: (sessionRow.total_pnl_nok || 0) + pnl,
          winning_trades:
            pnl > 0
              ? (sessionRow.winning_trades || 0) + 1
              : sessionRow.winning_trades,
          losing_trades:
            pnl <= 0
              ? (sessionRow.losing_trades || 0) + 1
              : sessionRow.losing_trades,
          updated_at: new Date().toISOString(),
        })
        .eq("id", trade.session_id);
    }

    // Create notification
    await supabase.from("notifications").insert({
      user_id: trade.user_id,
      type: "trade_closed",
      title: `${trade.symbol} Lukket - ${pnl >= 0 ? "Profit" : "Loss"}`,
      message: `${reason}: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%)`,
      related_id: trade.id,
      priority: "medium",
      read: false,
    });

    return { success: true, pnl };
  } catch (error) {
    console.error("Close trade error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check and handle phase progression
 */
async function checkPhaseProgression(
  sessionId: string,
  userId: string,
): Promise<void> {
  const supabase: unknown = createClient();

  // Note: The join with user_auto_trading_configs may not work due to schema issues
  // Fetch session and config separately
  const { data: session } = await (supabase as unknown)
    .from("auto_trading_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  const sessionRow = session as AutoTradingSessionRow | null;

  if (!sessionRow) return;

  const { data: config } = await (supabase as unknown)
    .from("user_auto_trading_configs")
    .select("*")
    .eq("id", sessionRow.config_id)
    .single();

  const configRow = config as UserAutoTradingConfigRow | null;

  if (!configRow) return;

  const daysActive = Math.floor(
    (Date.now() - new Date(sessionRow.created_at).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const isProfitable =
    sessionRow.current_capital_nok > sessionRow.starting_capital_nok;
  const totalReturn =
    (sessionRow.current_capital_nok - sessionRow.starting_capital_nok) /
    sessionRow.starting_capital_nok;

  let newPhase = sessionRow.phase;
  let canProgress = false;

  switch (sessionRow.phase) {
    case "paper":
      // Need 30 days and profitable
      if (daysActive >= 30 && isProfitable) {
        newPhase = "micro";
        canProgress = true;
      }
      break;
    case "micro":
      // Need 30 days and >5% return
      if (daysActive >= 30 && totalReturn > 0.05) {
        newPhase = "small";
        canProgress = true;
      }
      break;
    case "small":
      // Need 30 days and >10% return
      if (daysActive >= 30 && totalReturn > 0.1) {
        newPhase = "full";
        canProgress = true;
      }
      break;
  }

  if (canProgress && newPhase !== sessionRow.phase) {
    await (supabase as unknown)
      .from("user_auto_trading_configs")
      .update({ phase: newPhase })
      .eq("id", sessionRow.config_id);

    await supabase.from("notifications").insert({
      user_id: userId,
      type: "phase_progression",
      title: "Gratulerer! Ny Fase Oppnådd",
      message: `Du har avansert til ${newPhase}-fasen! ${getPhaseMessage(newPhase)}`,
      priority: "high",
      read: false,
    });
  }
}

function getPhaseMessage(phase: string): string {
  switch (phase) {
    case "micro":
      return "Du kan nå trade med ekte penger (maks $100).";
    case "small":
      return "Økt kapitaltilgang (maks $1,000).";
    case "full":
      return "Full kapitaltilgang! Du er en verifisert trader.";
    default:
      return "";
  }
}

/**
 * Get symbol trading rules from Binance
 */
async function getSymbolInfo(symbol: string): Promise<{
  stepSize: number;
  minQty: number;
  maxQty: number;
  minNotional: number;
}> {
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/exchangeInfo?symbol=${symbol}`,
    );
    const data = await response.json();

    const symbolInfo = data.symbols?.[0];
    if (!symbolInfo) {
      return {
        stepSize: 0.0001,
        minQty: 0.0001,
        maxQty: 999999,
        minNotional: 10,
      };
    }

    const lotSizeFilter = symbolInfo.filters?.find(
      (f: {
        filterType: string;
        stepSize?: string;
        minQty?: string;
        maxQty?: string;
      }) => f.filterType === "LOT_SIZE",
    );
    const minNotionalFilter = symbolInfo.filters?.find(
      (f: { filterType: string; minNotional?: string }) =>
        f.filterType === "MIN_NOTIONAL",
    );

    return {
      stepSize: parseFloat(lotSizeFilter?.stepSize ?? "0.0001"),
      minQty: parseFloat(lotSizeFilter?.minQty ?? "0.0001"),
      maxQty: parseFloat(lotSizeFilter?.maxQty ?? "999999"),
      minNotional: parseFloat(minNotionalFilter?.minNotional ?? "10"),
    };
  } catch {
    return {
      stepSize: 0.0001,
      minQty: 0.0001,
      maxQty: 999999,
      minNotional: 10,
    };
  }
}

/**
 * Round quantity to valid step size
 */
function roundToStepSize(quantity: number, stepSize: number): number {
  const precision = Math.round(-Math.log10(stepSize));
  const multiplier = Math.pow(10, precision);
  return Math.floor(quantity * multiplier) / multiplier;
}

/**
 * Calculate trailing stop price
 */
function calculateTrailingStop(
  trade: AutoTradingTrade,
  currentPrice: number,
): { newStopLoss: number | null; triggered: boolean } {
  if (
    !trade.trailing_stop_enabled ||
    !trade.trailing_stop_activation_pct ||
    !trade.trailing_stop_distance_pct
  ) {
    return { newStopLoss: null, triggered: false };
  }

  const entryPrice = trade.entry_price;
  const activationPct = trade.trailing_stop_activation_pct;
  const distancePct = trade.trailing_stop_distance_pct;

  if (trade.side === "LONG") {
    // Update highest price
    const highestPrice = Math.max(
      trade.highest_price ?? entryPrice,
      currentPrice,
    );

    // Calculate profit percentage
    const profitPct = ((currentPrice - entryPrice) / entryPrice) * 100;

    // Check if trailing stop is activated
    if (profitPct >= activationPct) {
      // Calculate new trailing stop
      const newStop = highestPrice * (1 - distancePct / 100);

      // Only update if new stop is higher than current stop
      if (newStop > (trade.stop_loss_price ?? 0)) {
        return { newStopLoss: newStop, triggered: false };
      }
    }

    // Check if trailing stop is hit
    if (currentPrice <= (trade.stop_loss_price ?? 0)) {
      return { newStopLoss: null, triggered: true };
    }
  } else {
    // SHORT position
    const lowestPrice = Math.min(
      trade.lowest_price ?? entryPrice,
      currentPrice,
    );
    const profitPct = ((entryPrice - currentPrice) / entryPrice) * 100;

    if (profitPct >= activationPct) {
      const newStop = lowestPrice * (1 + distancePct / 100);
      if (newStop < (trade.stop_loss_price ?? Infinity)) {
        return { newStopLoss: newStop, triggered: false };
      }
    }

    if (currentPrice >= (trade.stop_loss_price ?? Infinity)) {
      return { newStopLoss: null, triggered: true };
    }
  }

  return { newStopLoss: null, triggered: false };
}

/**
 * Check partial profit taking levels
 */
function checkPartialProfitLevels(
  trade: AutoTradingTrade,
  currentPrice: number,
): Array<{
  level: { target_pct: number; sell_pct: number; executed: boolean };
  closeQuantity: number;
}> {
  if (!trade.partial_tp_enabled || !trade.partial_tp_levels) return [];

  const entryPrice = trade.entry_price;
  const levelsToExecute: Array<{
    level: { target_pct: number; sell_pct: number; executed: boolean };
    closeQuantity: number;
  }> = [];

  for (const level of trade.partial_tp_levels) {
    if (level.executed) continue;

    const targetPrice = entryPrice * (1 + level.target_pct / 100);

    if (trade.side === "LONG" && currentPrice >= targetPrice) {
      const closeQuantity = trade.quantity * (level.sell_pct / 100);
      levelsToExecute.push({ level, closeQuantity });
    } else if (trade.side === "SHORT" && currentPrice <= targetPrice) {
      const closeQuantity = trade.quantity * (level.sell_pct / 100);
      levelsToExecute.push({ level, closeQuantity });
    }
  }

  return levelsToExecute;
}

/**
 * Execute partial close of a trade
 */
async function executePartialClose(
  trade: AutoTradingTrade,
  closeQuantity: number,
  currentPrice: number,
  level: { target_pct: number; sell_pct: number; executed: boolean },
): Promise<{ success: boolean; pnl?: number }> {
  const supabase: unknown = createClient();

  try {
    // Execute close order on Binance
    const closeSide = trade.side === "LONG" ? "SELL" : "BUY";

    const { data: orderResult, error: orderError } =
      await supabase.functions.invoke("place-binance-order", {
        body: {
          symbol: trade.symbol,
          side: closeSide,
          quantity: closeQuantity,
          order_type: "MARKET",
        },
      });

    if (orderError || !orderResult?.success) {
      throw new Error(orderError?.message || "Partial close order failed");
    }

    const exitPrice = parseFloat(
      orderResult.order.fills?.[0]?.price ?? currentPrice.toString(),
    );
    const pnl =
      trade.side === "LONG"
        ? (exitPrice - trade.entry_price) * closeQuantity
        : (trade.entry_price - exitPrice) * closeQuantity;

    // Update partial TP level as executed
    const updatedLevels = trade.partial_tp_levels?.map((l) =>
      l.target_pct === level.target_pct ? { ...l, executed: true } : l,
    );

    // Update trade - reduce quantity and update levels
    const newQuantity = trade.quantity - closeQuantity;

    // Note: The database schema doesn't support partial_tp_levels or these extra fields
    // This functionality would need a schema update or be handled in application logic
    console.warn("Partial close not fully persisted - schema limitation", {
      tradeId: trade.id,
      newQuantity,
      updatedLevels,
    });

    // Create notification
    await supabase.from("notifications").insert({
      user_id: trade.user_id,
      type: "partial_profit",
      title: `Delvis Profitt - ${trade.symbol}`,
      message: `Solgt ${level.sell_pct}% ved +${level.target_pct}%. P&L: +${pnl.toFixed(2)} kr`,
      related_id: trade.id,
      priority: "medium",
      read: false,
    });

    return { success: true, pnl };
  } catch (error) {
    console.error("Partial close error:", error);
    return { success: false };
  }
}

/**
 * Sync open trades with Binance
 * Call this periodically to update prices and check if stops/take profits hit
 */
export async function syncOpenTrades(userId: string): Promise<void> {
  const supabase: unknown = createClient();

  const { data: openTrades } = await (supabase as unknown)
    .from("auto_trading_trades")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "OPEN");

  if (!openTrades || openTrades.length === 0) return;

  // Note: Binance credentials should be fetched from a secure storage
  // The schema doesn't have these columns in user_auto_trading_configs
  // This needs to be implemented based on your actual credential storage
  console.warn("Binance credentials not available in current schema");

  // Get current prices for all symbols
  const typedOpenTrades = (openTrades || []) as AutoTradingTradeRow[];
  const symbols = [...new Set(typedOpenTrades.map((t) => t.symbol))];
  const prices: Record<string, number> = {};

  for (const symbol of symbols) {
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      );
      const data = await response.json();
      prices[symbol] = parseFloat(data.price);
    } catch (error) {
      console.error(`Failed to get price for ${symbol}:`, error);
    }
  }

  // Update trades and check stops
  for (const trade of typedOpenTrades) {
    const currentPrice = prices[trade.symbol];
    if (!currentPrice) continue;

    const unrealizedPnl =
      trade.side === "LONG"
        ? (currentPrice - trade.entry_price) * trade.quantity
        : (trade.entry_price - currentPrice) * trade.quantity;

    const unrealizedPnlPercent =
      (unrealizedPnl / trade.position_value_nok) * 100;

    // Calculate trailing stop
    const tradeAsAutoTradingTrade = trade as unknown as AutoTradingTrade;
    const trailingStopResult = calculateTrailingStop(
      tradeAsAutoTradingTrade,
      currentPrice,
    );

    // Note: The database schema doesn't have these columns
    // This would need a schema update or different approach
    console.warn("Trade price sync - schema limitations:", {
      tradeId: trade.id,
      currentPrice,
      unrealizedPnl,
      unrealizedPnlPercent,
      trailingStopResult,
    });
  }
}

/**
 * Run a single iteration of the auto-trading loop
 * Fetches active sessions and checks for signals
 */
export async function runAutoTradingIteration(
  supabaseClient?: ReturnType<typeof createClient>,
) {
  const supabase = supabaseClient || createClient();

  // 1. Fetch active sessions
  const { data: sessions, error: sessionError } = await (supabase as unknown)
    .from("auto_trading_sessions")
    .select("*")
    .eq("status", "active");

  if (sessionError) {
    console.error("Error fetching active sessions:", sessionError);
    return;
  }

  if (!sessions || sessions.length === 0) {
    return;
  }

  // 2. Process each session
  for (const session of sessions as AutoTradingSessionRow[]) {
    try {
      // Fetch config separately
      const { data: config } = await (supabase as unknown)
        .from("user_auto_trading_configs")
        .select("*")
        .eq("id", session.config_id)
        .single();

      const configRow = config as UserAutoTradingConfigRow | null;

      // Skip if no config
      if (!configRow) continue;

      // 3. Check if we should generate signals for this session
      const lastTradeTime = configRow.last_trade_at
        ? new Date(configRow.last_trade_at).getTime()
        : 0;
      const timeSinceLastTrade = Date.now() - lastTradeTime;

      // Minimum time between trades (5 minutes)
      if (timeSinceLastTrade < 5 * 60 * 1000) {
        continue;
      }

      // 4. Get strategy
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const strategy = createStrategy(configRow as any);

      // 5. Analyze each symbol
      const allowedSymbols = (configRow.custom_params?.allowed_symbols as string[] | undefined) || ["BTCUSDT"];
      for (const symbol of allowedSymbols) {
        try {
          // Get market data
          const marketAnalysis = await analyzeCurrentMarket(symbol);

          // Skip if market regime doesn't allow trading
          if (!marketAnalysis.recommendation.shouldTrade) {
            continue;
          }

          // Get historical data for indicators
          const klines = await getKlines(symbol, "1h", 100);
          const prices = klines.map((k) => parseFloat(k[4]));

          // Calculate indicators
          const indicators = await strategy.calculateIndicators(symbol, prices);

          // Get market data from analysis
          const analysisData = marketAnalysis as unknown as {
            volume24h?: number;
            priceChange24h?: number;
            high24h?: number;
            low24h?: number;
          };

          // Analyze for signal
          const signal = await strategy.analyze(
            {
              symbol,
              price: prices[prices.length - 1],
              volume_24h: analysisData.volume24h ?? 0,
              price_change_24h: analysisData.priceChange24h ?? 0,
              high_24h: analysisData.high24h ?? 0,
              low_24h: analysisData.low24h ?? 0,
              timestamp: new Date(),
            },
            indicators,
          );

          // If signal generated, execute trade
          if (signal) {
            // Note: Binance credentials need to be fetched from appropriate storage
            // The schema doesn't have these in user_auto_trading_configs
            console.warn(
              "Cannot execute trade - Binance credentials not in schema",
            );
          }
        } catch (error) {
          console.error(`Error analyzing ${symbol}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error processing session ${session.id}:`, error);
    }
  }
}
