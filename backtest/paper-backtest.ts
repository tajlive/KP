/**
 * Paper Backtest Engine
 * 
 * Simulerer trading med lekepenger (100 000 kr standard)
 * Bruker live Binance-data for realistiske resultater
 * Viser alltid HVORFOR hver trade skjedde eller ble blokkert
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase-generated";

export interface BacktestTrade {
  id: string;
  timestamp: string;
  symbol: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  quantity: number;
  reason: string;
  blocked?: boolean;
  blockReason?: string;
  pnl?: number;
  pnlPercent?: number;
}

export interface BacktestSession {
  id: string;
  userId: string;
  startCapital: number;
  currentCapital: number;
  startDate: string;
  endDate?: string;
  trades: BacktestTrade[];
  totalReturn: number;
  totalReturnPercent: number;
  maxDrawdown: number;
  winRate: number;
}

export interface BacktestConfig {
  userId: string;
  startCapital: number;
  riskLevel: "safe" | "balanced" | "aggressive";
  strategy: "dca" | "momentum" | "mean_reversion";
  symbols: string[];
  startDate?: Date;
  endDate?: Date;
}

const DEFAULT_STARTING_CAPITAL = 100000;

const RISK_CONFIGS = {
  safe: {
    maxPositionPct: 2,
    maxExposurePct: 5,
    maxDailyLossPct: 1,
    stopLossPct: 3,
    takeProfitPct: 6,
  },
  balanced: {
    maxPositionPct: 5,
    maxExposurePct: 15,
    maxDailyLossPct: 3,
    stopLossPct: 7,
    takeProfitPct: 14,
  },
  aggressive: {
    maxPositionPct: 10,
    maxExposurePct: 30,
    maxDailyLossPct: 5,
    stopLossPct: 15,
    takeProfitPct: 30,
  },
};

export async function initializeBacktest(
  config: BacktestConfig
): Promise<BacktestSession> {
  const supabase = createClient();
  
  const session: BacktestSession = {
    id: crypto.randomUUID(),
    userId: config.userId,
    startCapital: config.startCapital || DEFAULT_STARTING_CAPITAL,
    currentCapital: config.startCapital || DEFAULT_STARTING_CAPITAL,
    startDate: new Date().toISOString(),
    trades: [],
    totalReturn: 0,
    totalReturnPercent: 0,
    maxDrawdown: 0,
    winRate: 0,
  };

  const { error } = await supabase.from("backtest_sessions").insert({
    id: session.id,
    user_id: config.userId,
    start_capital: session.startCapital,
    current_capital: session.currentCapital,
    risk_level: config.riskLevel,
    strategy: config.strategy,
    symbols: config.symbols,
    start_date: session.startDate,
    status: "active",
  });

  if (error) {
    console.error("[Backtest] Failed to initialize:", error);
    throw new Error("Failed to initialize backtest session");
  }

  return session;
}

export async function simulateTrade(
  sessionId: string,
  userId: string,
  symbol: string,
  signal: "buy" | "sell" | "hold",
  currentPrice: number,
  reason: string
): Promise<BacktestTrade | null> {
  const supabase = createClient();

  const { data: session } = await supabase
    .from("backtest_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (!session || session.status !== "active") {
    return null;
  }

  const { data: riskProfile } = await supabase
    .from("risk_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  const riskLevel = (riskProfile?.name as keyof typeof RISK_CONFIGS) || "balanced";
  const riskConfig = RISK_CONFIGS[riskLevel];

  const maxPositionAmount = session.current_capital * (riskConfig.maxPositionPct / 100);
  const tradeAmount = Math.min(maxPositionAmount, session.current_capital * 0.02);
  const quantity = tradeAmount / currentPrice;

  let blocked = false;
  let blockReason = "";

  const today = new Date().toISOString().split("T")[0];
  const { data: todayTrades } = await supabase
    .from("backtest_trades")
    .select("pnl")
    .eq("session_id", sessionId)
    .gte("timestamp", today);

  const dailyLoss = todayTrades?.reduce((sum, t) => sum + (t.pnl < 0 ? t.pnl : 0), 0) || 0;
  const maxDailyLoss = session.current_capital * (riskConfig.maxDailyLossPct / 100);

  if (Math.abs(dailyLoss) >= maxDailyLoss) {
    blocked = true;
    blockReason = `Daglig tap-grense nådd: ${Math.abs(dailyLoss).toFixed(0)} kr tapt`;
  }

  const slippage = 0.001;
  const executedPrice = signal === "buy" 
    ? currentPrice * (1 + slippage) 
    : currentPrice * (1 - slippage);

  const trade: BacktestTrade = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    symbol,
    side: signal,
    amount: tradeAmount,
    price: executedPrice,
    quantity,
    reason: blocked ? `BLOKKERT: ${blockReason}` : reason,
    blocked,
    blockReason: blocked ? blockReason : undefined,
  };

  await supabase.from("backtest_trades").insert({
    id: trade.id,
    session_id: sessionId,
    user_id: userId,
    symbol,
    side: signal,
    amount: tradeAmount,
    price: executedPrice,
    quantity,
    reason: trade.reason,
    blocked,
    block_reason: blockReason,
    timestamp: trade.timestamp,
  });

  return trade;
}

export async function getBacktestStats(sessionId: string, userId: string) {
  const supabase = createClient();

  const { data: trades } = await supabase
    .from("backtest_trades")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("timestamp", { ascending: true });

  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      avgReturn: 0,
      maxDrawdown: 0,
      profitFactor: 0,
    };
  }

  const closedTrades = trades.filter((t: { pnl: number | null }) => t.pnl !== null);
  const winningTrades = closedTrades.filter((t: { pnl: number }) => t.pnl > 0);

  const totalProfit = winningTrades.reduce((sum: number, t: { pnl: number }) => sum + t.pnl, 0);
  const totalLoss = Math.abs(closedTrades.filter((t: { pnl: number }) => t.pnl <= 0).reduce((sum: number, t: { pnl: number }) => sum + t.pnl, 0));

  let maxDrawdown = 0;
  let peak = 0;
  let runningPnl = 0;

  for (const trade of closedTrades) {
    runningPnl += trade.pnl;
    if (runningPnl > peak) {
      peak = runningPnl;
    }
    const drawdown = peak - runningPnl;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return {
    totalTrades: trades.length,
    closedTrades: closedTrades.length,
    blockedTrades: trades.filter((t: { blocked: boolean }) => t.blocked).length,
    winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
    avgReturn: closedTrades.length > 0 
      ? closedTrades.reduce((sum: number, t: { pnl_percent: number }) => sum + t.pnl_percent, 0) / closedTrades.length 
      : 0,
    maxDrawdown,
    profitFactor: totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0,
    totalProfit,
    totalLoss,
  };
}

export default {
  initializeBacktest,
  simulateTrade,
  getBacktestStats,
  DEFAULT_STARTING_CAPITAL,
};
