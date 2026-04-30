/**
 * Auto-Trading Supabase Operations
 * Database operations for the auto-trading system
 *
 * KLA-69: Migrert fra slettede tabeller:
 *   auto_trading_sessions → trading_sessions
 *   auto_trading_trades   → trades
 */

import { createClient } from "@/lib/utils";
import type {
  AutoTradingStrategy,
  UserAutoTradingConfig,
  AutoTradingSession,
  AutoTradingTrade,
  TradingPhase,
  RiskLevel,
} from "./types";

const supabase = createClient();

// ============================================================
// STRATEGIES
// ============================================================

export async function getAllStrategies(): Promise<AutoTradingStrategy[]> {
  const { data, error } = await supabase
    .from("auto_trading_strategies")
    .select("*")
    .eq("is_active", true)
    .order("risk_level");

  if (error) {
    console.error("Error fetching strategies:", error);
    throw error;
  }

  return (data || []) as AutoTradingStrategy[];
}

export async function getStrategyById(
  strategyId: string,
): Promise<AutoTradingStrategy | null> {
  const { data, error } = await supabase
    .from("auto_trading_strategies")
    .select("*")
    .eq("id", strategyId)
    .single();

  if (error) {
    console.error("Error fetching strategy:", error);
    return null;
  }

  return data as AutoTradingStrategy | null;
}

export async function getStrategyByRiskLevel(
  riskLevel: RiskLevel,
): Promise<AutoTradingStrategy | null> {
  const { data, error } = await supabase
    .from("auto_trading_strategies")
    .select("*")
    .eq("risk_level", riskLevel)
    .eq("is_active", true)
    .single();

  if (error) {
    console.error("Error fetching strategy by risk level:", error);
    return null;
  }

  return data as AutoTradingStrategy | null;
}

// ============================================================
// USER CONFIG
// ============================================================

export async function getUserConfig(
  userId: string,
): Promise<UserAutoTradingConfig | null> {
  const { data, error } = await supabase
    .from("user_auto_trading_configs")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching user config:", error);
    return null;
  }

  return data as UserAutoTradingConfig | null;
}

export async function createUserConfig(
  userId: string,
  strategyId: string,
  tradingCapital: number = 10000,
): Promise<UserAutoTradingConfig | null> {
  const { data, error } = await supabase
    .from("user_auto_trading_configs")
    .insert({
      user_id: userId,
      strategy_id: strategyId,
      is_enabled: false,
      is_paper_trading: true,
      trading_capital_nok: tradingCapital,
      phase: "paper" as TradingPhase,
      allocated_capital_pct: 10.0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating user config:", error);
    return null;
  }

  return data as UserAutoTradingConfig | null;
}

export async function updateUserConfig(
  userId: string,
  updates: Partial<UserAutoTradingConfig>,
): Promise<boolean> {
  const { error } = await supabase
    .from("user_auto_trading_configs")
    .update(updates as never).eq("user_id", userId);

  if (error) {
    console.error("Error updating user config:", error);
    return false;
  }

  return true;
}

export async function enableAutoTrading(
  userId: string,
  enabled: boolean,
): Promise<boolean> {
  return await updateUserConfig(userId, { is_enabled: enabled });
}

// ============================================================
// SESSIONS — bruker nå canonical tabell: trading_sessions
// ============================================================

export async function getActiveSession(
  userId: string,
): Promise<AutoTradingSession | null> {
  const { data, error } = await supabase
    .from("trading_sessions") // ← var: auto_trading_sessions
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching active session:", error);
    return null;
  }

  return data as unknown as AutoTradingSession | null;
}

export async function getUserSessions(
  userId: string,
  limit: number = 10,
): Promise<AutoTradingSession[]> {
  const { data, error } = await supabase
    .from("trading_sessions") // ← var: auto_trading_sessions
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching user sessions:", error);
    return [];
  }

  return (data || []) as unknown as AutoTradingSession[];
}

export async function createSession(
  userId: string,
  configId: string,
  strategyName: string,
  isPaperTrading: boolean,
  phase: TradingPhase,
  startingCapital: number,
  allocatedCapitalPct: number,
): Promise<AutoTradingSession | null> {
  // Archive existing active sessions for this user to prevent duplicate
  // active sessions (root cause of capital mismatch).
  const { error: archiveError } = await supabase
    .from("trading_sessions")
    .update({
      status: "stopped",
      stopped_at: new Date().toISOString(),
      archived: true,
      archived_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "active")
    .is("archived", false);

  if (archiveError) {
    console.error("Error archiving old sessions:", archiveError);
  }

  const { data, error } = await supabase
    .from("trading_sessions") // ← var: auto_trading_sessions
    .insert({
      user_id: userId,
      config_id: configId,
      strategy_name: strategyName,
      is_paper_trading: isPaperTrading,
      phase,
      starting_capital_nok: startingCapital,
      current_capital_nok: startingCapital,
      allocated_capital_pct: allocatedCapitalPct,
      status: "active",
    } as never)
    .select()
    .single();

  if (error) {
    console.error("Error creating session:", error);
    return null;
  }

  return data as unknown as AutoTradingSession | null;
}

export async function updateSession(
  sessionId: string,
  updates: Partial<AutoTradingSession>,
): Promise<boolean> {
  const { error } = await supabase
    .from("trading_sessions") // ← var: auto_trading_sessions
    .update(updates as never).eq("id", sessionId);

  if (error) {
    console.error("Error updating session:", error);
    return false;
  }

  return true;
}

export async function pauseSession(
  sessionId: string,
  reason: string,
): Promise<boolean> {
  return await updateSession(sessionId, {
    status: "PAUSED",
    pause_reason: reason,
  });
}

export async function stopSession(sessionId: string): Promise<boolean> {
  // Archive the session so its capital is no longer counted in totals.
  // The active session remains the canonical source of truth.
  return await updateSession(sessionId, {
    status: "STOPPED",
    ended_at: new Date().toISOString(),
    archived: true,
    archived_at: new Date().toISOString(),
  } as Partial<AutoTradingSession>);
}

// ============================================================
// TRADES — bruker nå canonical tabell: trades
// ============================================================

export async function getSessionTrades(
  sessionId: string,
): Promise<AutoTradingTrade[]> {
  const { data, error } = await supabase
    .from("trades") // ← var: auto_trading_trades
    .select("*")
    .eq("session_id", sessionId)
    .order("opened_at", { ascending: false });

  if (error) {
    console.error("Error fetching session trades:", error);
    return [];
  }

  return (data || []) as unknown as AutoTradingTrade[];
}

export async function getOpenTrades(
  sessionId: string,
): Promise<AutoTradingTrade[]> {
  const { data, error } = await supabase
    .from("trades") // ← var: auto_trading_trades
    .select("*")
    .eq("session_id", sessionId)
    .eq("status", "OPEN")
    .order("opened_at", { ascending: false });

  if (error) {
    console.error("Error fetching open trades:", error);
    return [];
  }

  return (data || []) as unknown as AutoTradingTrade[];
}

export async function createTrade(
  trade: Partial<AutoTradingTrade>,
): Promise<AutoTradingTrade | null> {
  const { data, error } = await supabase
    .from("trades") // ← var: auto_trading_trades
    .insert(trade as never)
    .select()
    .single();

  if (error) {
    console.error("Error creating trade:", error);
    return null;
  }

  return data as unknown as AutoTradingTrade | null;
}

export async function closeTrade(
  tradeId: string,
  exitPrice: number,
  pnlNok: number,
  pnlPct: number,
  closeReason: string,
  feesNok: number = 0,
): Promise<boolean> {
  const { error } = await supabase
    .from("trades") // ← var: auto_trading_trades
    .update({
      status: "CLOSED",
      exit_price: exitPrice,
      pnl_nok: pnlNok,
      pnl_pct: pnlPct,
      close_reason: closeReason,
      fees_nok: feesNok,
      closed_at: new Date().toISOString(),
    } as never)
    .eq("id", tradeId);

  if (error) {
    console.error("Error closing trade:", error);
    return false;
  }

  return true;
}

// ============================================================
// DAILY METRICS
// ============================================================

export async function getTodayMetrics(
  sessionId: string,
): Promise<Record<string, unknown> | null> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("auto_trading_daily_metrics")
    .select("*")
    .eq("session_id", sessionId)
    .eq("date", today)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching today metrics:", error);
    return null;
  }

  return data;
}

export async function updateDailyMetrics(
  sessionId: string,
  userId: string,
  metrics: Record<string, unknown>,
): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("auto_trading_daily_metrics").upsert({
    session_id: sessionId,
    user_id: userId,
    date: today,
    ...metrics,
  } as never);

  if (error) {
    console.error("Error updating daily metrics:", error);
    return false;
  }

  return true;
}

// ============================================================
// CIRCUIT BREAKER
// ============================================================

export async function logCircuitBreaker(
  sessionId: string,
  userId: string,
  triggerType: string,
  triggerValue: string,
  action: string,
  resumeAt?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("auto_trading_circuit_breaker_logs")
    .insert({
      session_id: sessionId,
      user_id: userId,
      trigger_type: triggerType,
      trigger_value: triggerValue,
      action,
      resume_at: resumeAt,
    });

  if (error) {
    console.error("Error logging circuit breaker:", error);
    return false;
  }

  return true;
}

// ============================================================
// PROFIT EXTRACTION
// ============================================================

export async function logProfitExtraction(
  sessionId: string,
  userId: string,
  totalProfitNok: number,
  totalProfitPct: number,
  extractedAmountNok: number,
  extractedPct: number,
  remainingProfitNok: number,
  capitalBeforeNok: number,
  capitalAfterNok: number,
  method: "auto" | "manual" = "auto",
): Promise<boolean> {
  const { error } = await supabase
    .from("auto_trading_profit_extractions")
    .insert({
      session_id: sessionId,
      user_id: userId,
      total_profit_nok: totalProfitNok,
      total_profit_pct: totalProfitPct,
      extracted_amount_nok: extractedAmountNok,
      extracted_pct: extractedPct,
      remaining_profit_nok: remainingProfitNok,
      capital_before_nok: capitalBeforeNok,
      capital_after_nok: capitalAfterNok,
      extraction_method: method,
    });

  if (error) {
    console.error("Error logging profit extraction:", error);
    return false;
  }

  return true;
}
