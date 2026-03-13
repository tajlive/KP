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
    const supabase = createClient();

    // =========================================================================
    // LAYER 1: Check if auto-trading is enabled for this user
    // =========================================================================
    const { data: session } = await supabase
      .from("auto_trading_sessions")
      .select("*")
      .eq("id", sessionId)
      .single() as any;

    if (!session || session.status !== "ACTIVE") {
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
    const { data: todaysTrades } = await supabase
      .from("auto_trades")
      .select("*")
      .eq("session_id", sessionId)
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      );

    const { data: weeksTrades } = await supabase
      .from("auto_trades")
      .select("*")
      .eq("session_id", sessionId)
      .gte(
        "created_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      );

    const circuitBreakerConfig =
      CIRCUIT_BREAKER_DEFAULTS[config.risk_level || "balanced"];

    // Calculate consecutive losses
    const recentClosedTrades = (todaysTrades || [])
      .filter((t) => t.status === "CLOSED")
      .sort(
        (a, b) =>
          new Date(b.closed_at || 0).getTime() -
          new Date(a.closed_at || 0).getTime(),
      );

    let consecutiveLosses = 0;
    for (const trade of recentClosedTrades) {
      if ((trade.realized_pnl! || 0) < 0) consecutiveLosses++;
      else break;
    }

    // Calculate current drawdown
    const peakBalance = session.peak_balance || session.starting_capital_nok;
    const currentDrawdown =
      (peakBalance - session.current_capital_nok) / peakBalance;

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
      currentPortfolioValue: session.current_capital_nok,
      todaysTrades: todaysTrades || [],
      weeksTrades: weeksTrades || [],
      allTrades: [],
      consecutiveLosses,
      currentDrawdown,
    });

    if (!circuitCheck.passed) {
      // Pause session if circuit breaker triggered
      if (circuitCheck.level === "daily" || circuitCheck.level === "strategy") {
        await supabase
          .from("auto_trading_sessions")
          .update({
            status: "PAUSED",
            paused_reason: circuitCheck.triggered,
            paused_at: new Date().toISOString(),
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
      todaysTrades || [],
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
    const { data: openPositions } = await supabase
      .from("auto_trades")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "OPEN");

    const correlationCheck = checkNewTradeCorrelation(
      signal.symbol,
      openPositions || [],
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
    const historicalTrades = await supabase
      .from("auto_trades")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "CLOSED")
      .limit(50);

    const closedTrades = historicalTrades.data || [];
    const winningTrades = closedTrades.filter((t) => (t.realized_pnl || 0) > 0);

    const winRate =
      closedTrades.length > 0
        ? winningTrades.length / closedTrades.length
        : 0.5;
    const avgWin =
      winningTrades.length > 0
        ? winningTrades.reduce(
            (sum, t) => sum + (t.realized_pnl || 0) / (t.amount! || 1),
            0,
          ) / winningTrades.length
        : 0.05;
    const avgLoss =
      closedTrades.length > winningTrades.length
        ? closedTrades
            .filter((t) => (t.realized_pnl || 0) <= 0)
            .reduce(
              (sum, t) =>
                sum + Math.abs((t.realized_pnl || 0) / (t.amount! || 1)),
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
      portfolioValue: session.current_capital_nok,
      riskTolerance:
        OPTIMIZED_PROFILES[(config.risk_level as RiskLevel) || "moderate"]
          ?.kellyFraction || 0.5,
    });

    // Apply position size limit from config
    const maxPositionValue = Math.min(
      positionSize.dollarAmount,
      session.current_capital_nok * ((config.max_position_size || 10) / 100),
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

    // Prepare partial TP levels
    const partialTpLevels =
      signal.partial_tp_levels?.map((level) => ({
        target_pct: level.target_pct,
        sell_pct: level.sell_pct,
        executed: false,
      })) || [];

    const { data: trade, error: tradeError } = await supabase
      .from("auto_trades")
      .insert({
        user_id: userId,
        session_id: sessionId,
        symbol: signal.symbol,
        side: signal.side,
        entry_price: currentPrice,
        current_price: currentPrice,
        amount: maxPositionValue,
        quantity: roundedQuantity,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        status: "OPEN",
        binance_order_id: orderResult.order.orderId,
        strategy_used: config.selected_strategy,
        risk_level: config.risk_level,
        market_regime: marketAnalysis.regime,
        ml_confidence: riskAssessment.confidence,
        kelly_percentage: positionSize.adjustedPercentage,
        referral_code: BINANCE_REFERRAL.code, // Track referral
        // Trailing stop
        trailing_stop_enabled: signal.trailing_stop?.enabled || false,
        trailing_stop_activation_pct: signal.trailing_stop?.activation_pct,
        trailing_stop_distance_pct: signal.trailing_stop?.distance_pct,
        highest_price: signal.side === "LONG" ? currentPrice : undefined,
        lowest_price: signal.side === "SHORT" ? currentPrice : undefined,
        // Partial profit taking
        partial_tp_enabled: partialTpLevels.length > 0,
        partial_tp_levels: partialTpLevels,
      })
      .select()
      .single() as any;

    if (tradeError) {
      console.error("Failed to record trade:", tradeError);
    }

    // Update session
    await supabase
      .from("auto_trading_sessions")
      .update({
        total_trades: (session.total_trades || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    // Create notification
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "trade_executed",
      title: `${signal.side} ${signal.symbol}`,
      message: `Posisjon åpnet: ${roundedQuantity} ${signal.symbol.replace("USDT", "")} @ $${currentPrice}`,
      related_id: trade?.id,
      priority: "medium",
      read: false,
    });

    // Trigger social copy trading (async, don't await)
    if (trade) {
      copyTrade(trade).catch((err) =>
        console.error("Copy trading error:", err),
      );
    }

    return {
      success: true,
      trade: trade || undefined,
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
    const supabase = createClient();

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
      orderResult.order.fills?.[0]?.price ||
        trade.current_price?.toString() ||
        "0",
    );
    const pnl =
      trade.side === "LONG"
        ? (exitPrice - trade.entry_price) * trade.quantity
        : (trade.entry_price - exitPrice) * trade.quantity;

    const pnlPercent = (pnl / trade.amount!) * 100;

    // Update trade record
    await supabase
      .from("auto_trades")
      .update({
        status: "CLOSED",
        exit_price: exitPrice,
        realized_pnl: pnl,
        realized_pnl_percent: pnlPercent,
        closed_at: new Date().toISOString(),
        closed_reason: reason,
        binance_close_order_id: orderResult.order.orderId,
      })
      .eq("id", trade.id);

    // Update session balance
    const { data: session } = await supabase
      .from("auto_trading_sessions")
      .select("*")
      .eq("id", trade.session_id)
      .single() as any;

    if (session) {
      const newBalance = session.current_capital_nok + pnl;
      const newPeak = Math.max(session.peak_balance || 0, newBalance);

      await supabase
        .from("auto_trading_sessions")
        .update({
          current_capital_nok: newBalance,
          peak_balance: newPeak,
          total_pnl_nok: (session.total_pnl_nok || 0) + pnl,
          winning_trades:
            pnl > 0
              ? (session.winning_trades || 0) + 1
              : session.winning_trades,
          losing_trades:
            pnl <= 0 ? (session.losing_trades || 0) + 1 : session.losing_trades,
          updated_at: new Date().toISOString(),
        })
        .eq("id", trade.session_id);

      // Check for phase progression
      await checkPhaseProgression(trade.session_id, trade.user_id);
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
  const supabase = createClient();

  const { data: session } = await supabase
    .from("auto_trading_sessions")
    .select("*, config:user_auto_trading_configs(*)")
    .eq("id", sessionId)
    .single() as any;

  if (!session || !session.config) return;

  const daysActive = Math.floor(
    (Date.now() - new Date(session.created_at).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const isProfitable =
    session.current_capital_nok > session.starting_capital_nok;
  const totalReturn =
    (session.current_capital_nok - session.starting_capital_nok) /
    session.starting_capital_nok;

  let newPhase = session.phase;
  let canProgress = false;

  switch (session.phase) {
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

  if (canProgress && newPhase !== session.phase) {
    await supabase
      .from("auto_trading_sessions")
      .update({ phase: newPhase })
      .eq("id", sessionId);

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
      stepSize: parseFloat(lotSizeFilter?.stepSize || "0.0001"),
      minQty: parseFloat(lotSizeFilter?.minQty || "0.0001"),
      maxQty: parseFloat(lotSizeFilter?.maxQty || "999999"),
      minNotional: parseFloat(minNotionalFilter?.minNotional || "10"),
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
      trade.highest_price || entryPrice,
      currentPrice,
    );

    // Calculate profit percentage
    const profitPct = ((currentPrice - entryPrice) / entryPrice) * 100;

    // Check if trailing stop is activated
    if (profitPct >= activationPct) {
      // Calculate new trailing stop
      const newStop = highestPrice * (1 - distancePct / 100);

      // Only update if new stop is higher than current stop
      if (newStop > (trade.stop_loss! || 0)) {
        return { newStopLoss: newStop, triggered: false };
      }
    }

    // Check if trailing stop is hit
    if (currentPrice <= (trade.stop_loss! || 0)) {
      return { newStopLoss: null, triggered: true };
    }
  } else {
    // SHORT position
    const lowestPrice = Math.min(
      trade.lowest_price || entryPrice,
      currentPrice,
    );
    const profitPct = ((entryPrice - currentPrice) / entryPrice) * 100;

    if (profitPct >= activationPct) {
      const newStop = lowestPrice * (1 + distancePct / 100);
      if (newStop < (trade.stop_loss! || Infinity)) {
        return { newStopLoss: newStop, triggered: false };
      }
    }

    if (currentPrice >= (trade.stop_loss! || Infinity)) {
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
  const supabase = createClient();

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
      orderResult.order.fills?.[0]?.price || currentPrice.toString(),
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

    await supabase
      .from("auto_trades")
      .update({
        quantity: newQuantity,
        partial_tp_levels: updatedLevels,
        // Move stop loss to breakeven after first partial TP
        stop_loss: Math.max(trade.stop_loss! || 0, trade.entry_price),
        updated_at: new Date().toISOString(),
      })
      .eq("id", trade.id);

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
  const supabase = createClient();

  const { data: openTrades } = await supabase
    .from("auto_trades")
    .select("*")
    .eq("user_id" as any, userId)
    .eq("status", "OPEN");

  if (!openTrades || openTrades.length === 0) return;

  // Fetch user credentials for Binance
  const { data: userConfig } = await supabase
    .from("user_auto_trading_configs")
    .select("binance_api_key, binance_api_secret, is_testnet")
    .eq("user_id" as any, userId)
    .single() as any;

  if (!userConfig?.binance_api_key || !userConfig?.binance_api_secret) {
    console.warn(`No Binance credentials for user ${userId}`);
    return;
  }

  const credentials: BinanceCredentials = {
    apiKey: userConfig.binance_api_key as string,
    apiSecret: userConfig.binance_api_secret as string,
    isTestnet: userConfig.is_testnet,
  };

  // Get current prices for all symbols
  const symbols = [...new Set(openTrades.map((t) => t.symbol))];
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
  for (const trade of openTrades) {
    const currentPrice = prices[trade.symbol];
    if (!currentPrice) continue;

    const unrealizedPnl =
      trade.side === "LONG"
        ? (currentPrice - trade.entry_price) * trade.quantity
        : (trade.entry_price - currentPrice) * trade.quantity;

    const unrealizedPnlPercent =
      (unrealizedPnl / trade.position_value_nok) * 100;

    // Calculate trailing stop
    const trailingStopResult = calculateTrailingStop(trade, currentPrice);

    // Update current price, unrealized PnL, and potentially trailing stop
    const updateData: {
      current_price: number;
      unrealized_pnl: number;
      unrealized_pnl_percent: number;
      updated_at: string;
      highest_price?: number;
      lowest_price?: number;
      stop_loss_price?: number;
    } = {
      current_price: currentPrice,
      unrealized_pnl: unrealizedPnl,
      unrealized_pnl_percent: unrealizedPnlPercent,
      updated_at: new Date().toISOString(),
    };

    // Update highest/lowest price for trailing stop
    if (trade.side === "LONG") {
      updateData.highest_price = Math.max(
        trade.highest_price || trade.entry_price,
        currentPrice,
      );
    } else {
      updateData.lowest_price = Math.min(
        trade.lowest_price || trade.entry_price,
        currentPrice,
      );
    }

    // Update trailing stop if activated
    if (trailingStopResult.newStopLoss) {
      updateData.stop_loss_price = trailingStopResult.newStopLoss;
    }

    await supabase
      .from("auto_trades")
      .update(updateData)
      .eq("id", trade.id);

    // Check partial profit taking
    const partialLevels = checkPartialProfitLevels(trade, currentPrice);
    for (const { level, closeQuantity } of partialLevels) {
      await executePartialClose(trade, closeQuantity, currentPrice, level);
    }

    // Check stop loss (including trailing)
    const stopHit =
      trade.side === "LONG"
        ? currentPrice <=
          (trailingStopResult.newStopLoss ||
            trade.stop_loss_price ||
            trade.stop_loss! ||
            0)
        : currentPrice >=
          (trailingStopResult.newStopLoss ||
            trade.stop_loss_price ||
            trade.stop_loss! ||
            Infinity);

    // Check take profit
    const tpHit =
      (trade.take_profit_price || trade.take_profit) &&
      (trade.side === "LONG"
        ? currentPrice >= (trade.take_profit_price || trade.take_profit || 0)
        : currentPrice <=
          (trade.take_profit_price || trade.take_profit || Infinity));

    if (stopHit) {
      console.info(`🔴 Stop loss triggered for trade ${trade.id}`);
      await closeTrade(
        trade,
        trade.trailing_stop_enabled &&
          unrealizedPnlPercent > (trade.trailing_stop_activation_pct || 0)
          ? "TRAILING_STOP"
          : "STOP_LOSS",
        credentials,
      );
    } else if (tpHit) {
      console.info(`🎯 Take profit hit for trade ${trade.id}`);
      await closeTrade(trade, "TAKE_PROFIT", credentials);
    }
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
  const { data: sessions, error: sessionError } = await supabase
    .from("auto_trading_sessions")
    .select("*, config:user_auto_trading_configs(*)")
    .eq("status", "ACTIVE");

  if (sessionError) {
    console.error("Error fetching active sessions:", sessionError);
    return;
  }

  if (!sessions || sessions.length === 0) {
    return;
  }

  // 2. Process each session
  for (const session of sessions) {
    try {
      // Skip if no config
      if (!session.config) continue;

      // 3. Check if we should generate signals for this session
      const lastTradeTime = session.last_trade_at
        ? new Date(session.last_trade_at).getTime()
        : 0;
      const timeSinceLastTrade = Date.now() - lastTradeTime;

      // Minimum time between trades (5 minutes)
      if (timeSinceLastTrade < 5 * 60 * 1000) {
        continue;
      }

      // 4. Get strategy
      const strategy = createStrategy(session.config);

      // 5. Analyze each symbol
      for (const symbol of session.config.allowed_symbols || ["BTCUSDT"]) {
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
              volume_24h: analysisData.volume24h || 0,
              price_change_24h: analysisData.priceChange24h || 0,
              high_24h: analysisData.high24h || 0,
              low_24h: analysisData.low24h || 0,
              timestamp: new Date(),
            },
            indicators,
          );

          // If signal generated, execute trade
          if (signal) {
            // Get user credentials
            const { data: userConfig } = await supabase
              .from("user_auto_trading_configs")
              .select("binance_api_key, binance_api_secret, is_testnet")
              .eq("user_id" as any, session.user_id)
              .single() as any;

            if (
              !userConfig?.binance_api_key ||
              !userConfig?.binance_api_secret
            ) {
              console.warn(
                `No Binance credentials for user ${session.user_id}`,
              );
              continue;
            }

            const credentials: BinanceCredentials = {
              apiKey: userConfig.binance_api_key as string,
              apiSecret: userConfig.binance_api_secret as string,
              isTestnet: userConfig.is_testnet,
            };

            // Execute the trade
            const result = await executeTrade({
              userId: session.user_id,
              sessionId: session.id,
              signal,
              config: session.config,
              credentials,
            });

            if (result.success) {
              console.info(
                `✅ Trade executed for ${session.user_id}: ${symbol} ${signal.side}`,
              );
            } else {
              console.warn(
                `⚠️ Trade failed for ${session.user_id}:`,
                result.error,
              );
            }
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
