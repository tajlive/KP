/**
 * Kanonisk risk-engine for Klarpakke trading.
 *
 * Modus-agnostisk validering av trades mot resolved risk-limits.
 * Modusspesifikke forskjeller (paper demo-defaults vs live profil) kommer fra
 * limits-resolver; denne motoren skal være identisk for test og live.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/sentry";
import {
  resolveRiskLimits,
  type RawRiskProfile,
  type ResolvedRiskLimits,
} from "./limits-resolver";
import type { TradingMode } from "@/lib/trading/canonical/symbols/registry";

export type RejectionReason =
  | "NO_RISK_PROFILE"
  | "BOT_NOT_HEALTHY"
  | "POSITION_LIMIT_EXCEEDED"
  | "EXPOSURE_LIMIT_EXCEEDED"
  | "DAILY_LOSS_LIMIT_EXCEEDED"
  | "DAILY_LOSS_CHECK_FAILED"
  | "PAIR_NOT_ALLOWED"
  | "LEVERAGE_NOT_ALLOWED"
  | "INSUFFICIENT_BALANCE"
  | "NO_POSITION"
  | "ESTIMATED_FILL_FAILED"
  | "SESSION_NOT_ACTIVE"
  | "INVALID_TRADING_MODE";

export interface RiskCheckRequest {
  userId: string;
  sessionId: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  orderType: "market" | "limit";
  tradingMode: TradingMode;
  botId?: string;
  /**
   * Ekstra estimert kostnad (slippage + gebyr) for daglig tapsprojeksjon.
   * Settes av execution-laget slik at modusspesifikke gebyrer/slippage
   * holdes utenfor den kanoniske motoren.
   */
  estimatedCost?: number;
}

export interface RiskCheckResult {
  allowed: boolean;
  rejectionReason?: RejectionReason;
  rejectionDetails?: Record<string, unknown>;
  limits?: ResolvedRiskLimits;
  preTradePositionPct?: number;
  postTradePositionPct?: number;
  preTradeExposurePct?: number;
  postTradeExposurePct?: number;
  dailyLossPct?: number;
}

export interface SessionInfo {
  id: string;
  user_id: string;
  mode: TradingMode;
  status: string;
  current_capital_nok: number;
  starting_capital_nok: number;
}

export interface RiskEngineOptions {
  /**
   * Konverterer USDT-denominated verdier til sessionens kapitalvaluta.
   * For live er dette typisk identitet; for paper USDT→NOK.
   */
  convertValue?: (usdtAmount: number) => number;
}

const DEFAULT_HEARTBEAT_STALE_MS = 5 * 60 * 1000;
const DEFAULT_MAX_CONSECUTIVE_ERRORS = 3;

function normalizeSymbol(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Validerer en trade mot resolved risk-limits.
 *
 * FAIL CLOSED: manglende data eller feil resulterer i avvisning.
 */
export async function checkTradeRisk(
  supabase: SupabaseClient,
  trade: RiskCheckRequest,
  session: SessionInfo,
  profile: RawRiskProfile | null,
  options: RiskEngineOptions = {},
): Promise<RiskCheckResult> {
  // 1. Sjekk session status.
  // Paused paper-sesjon = manuell handel uten bot (auto-opprettede sesjoner
  // er paused by design). Cron-ticken henter kun status='active', saa bot-
  // veien treffer aldri denne unntaket.
  const isManualPaperOnPaused =
    trade.tradingMode === "paper" && session.status === "paused";
  if (session.status !== "active" && !isManualPaperOnPaused) {
    return {
      allowed: false,
      rejectionReason: "SESSION_NOT_ACTIVE",
      rejectionDetails: {
        sessionStatus: session.status,
        message: `Session is ${session.status}, cannot execute trades`,
      },
    };
  }

  // 2. Verifiser trading mode match
  if (session.mode !== trade.tradingMode) {
    return {
      allowed: false,
      rejectionReason: "INVALID_TRADING_MODE",
      rejectionDetails: {
        sessionMode: session.mode,
        requestedMode: trade.tradingMode,
      },
    };
  }

  // 3. Resolve limits (modusspesifikk logikk ligger her)
  const limits = resolveRiskLimits(trade.tradingMode, profile);
  if (!limits) {
    return {
      allowed: false,
      rejectionReason: "NO_RISK_PROFILE",
      rejectionDetails: {
        message: "Live trading requires explicit risk profile selection",
      },
    };
  }

  // 4. Sjekk bot health hvis botId er spesifisert
  if (trade.botId) {
    const healthResult = await checkBotHealth(supabase, trade.botId);
    if (!healthResult.allowed) {
      return healthResult;
    }
  }

  // 5. Sjekk allowed pairs
  const normalizedSymbol = normalizeSymbol(trade.symbol);
  if (!limits.allowedPairs.includes(normalizedSymbol)) {
    return {
      allowed: false,
      rejectionReason: "PAIR_NOT_ALLOWED",
      rejectionDetails: {
        symbol: trade.symbol,
        normalizedSymbol,
        allowedPairs: limits.allowedPairs,
      },
      limits,
    };
  }

  // 6. Sjekk leverage (limit orders tolkes foreløpig ikke som leverage)
  if (trade.orderType === "limit" && !limits.leverageAllowed) {
    // Ingen ekstra handling; limit er tillatt selv uten leverage.
  }

  // 7. Beregn nøkkeltall
  const currentCapital = Number(session.current_capital_nok);
  const convert = options.convertValue ?? ((v: number) => v);
  const orderValueUsdt = trade.quantity * trade.price;
  const orderValue = convert(orderValueUsdt);

  const { data: positions } = await supabase
    .from("positions")
    .select("symbol, quantity, avg_entry_price")
    .eq("user_id", trade.userId);

  type PositionRow = {
    symbol?: string;
    quantity?: number;
    avg_entry_price?: number;
  };
  const positionsList = (positions ?? []) as PositionRow[];
  const currentExposureUsdt = positionsList.reduce((sum, pos) => {
    return sum + Number(pos.quantity) * Number(pos.avg_entry_price);
  }, 0);
  const currentExposure = convert(currentExposureUsdt);

  const existingPosition = positionsList.find(
    (p) => normalizeSymbol(p.symbol ?? "") === normalizedSymbol,
  );
  const existingPositionValueUsdt = existingPosition
    ? Number(existingPosition.quantity) * Number(existingPosition.avg_entry_price)
    : 0;
  const existingPositionValue = convert(existingPositionValueUsdt);

  let postTradePositionValue: number;
  if (trade.side === "buy") {
    postTradePositionValue = existingPositionValue + orderValue;
  } else {
    postTradePositionValue = Math.max(0, existingPositionValue - orderValue);
  }

  const postTradeExposure =
    trade.side === "buy"
      ? currentExposure + orderValue
      : currentExposure - Math.min(orderValue, existingPositionValue);

  const preTradePositionPct = currentCapital > 0 ? (existingPositionValue / currentCapital) * 100 : 0;
  const postTradePositionPct = currentCapital > 0 ? (postTradePositionValue / currentCapital) * 100 : 0;
  const preTradeExposurePct = currentCapital > 0 ? (currentExposure / currentCapital) * 100 : 0;
  const postTradeExposurePct = currentCapital > 0 ? (postTradeExposure / currentCapital) * 100 : 0;

  // 8. Sjekk position limit (alltid, med resolved limits)
  if (postTradePositionPct > limits.maxPositionPct) {
    return {
      allowed: false,
      rejectionReason: "POSITION_LIMIT_EXCEEDED",
      rejectionDetails: {
        maxAllowed: limits.maxPositionPct,
        postTradePosition: postTradePositionPct,
        orderValue,
      },
      limits,
      preTradePositionPct,
      postTradePositionPct,
    };
  }

  // 9. Sjekk exposure limit
  if (postTradeExposurePct > limits.maxExposurePct) {
    return {
      allowed: false,
      rejectionReason: "EXPOSURE_LIMIT_EXCEEDED",
      rejectionDetails: {
        maxAllowed: limits.maxExposurePct,
        postTradeExposure: postTradeExposurePct,
      },
      limits,
      preTradeExposurePct,
      postTradeExposurePct,
    };
  }

  // 10. Sjekk daily loss limit
  const dailyLossCheck = await checkDailyLoss(
    supabase,
    trade.userId,
    trade.sessionId,
    currentCapital,
    trade.estimatedCost ?? 0,
    limits.maxDailyLossPct,
  );
  if (!dailyLossCheck.allowed) {
    return {
      ...dailyLossCheck,
      limits,
      preTradePositionPct,
      postTradePositionPct,
      preTradeExposurePct,
      postTradeExposurePct,
    };
  }

  // 11. Sjekk balance for buy orders
  if (trade.side === "buy" && orderValue > currentCapital) {
    return {
      allowed: false,
      rejectionReason: "INSUFFICIENT_BALANCE",
      rejectionDetails: {
        required: orderValue,
        available: currentCapital,
      },
      limits,
      preTradePositionPct,
      postTradePositionPct,
      preTradeExposurePct,
      postTradeExposurePct,
    };
  }

  // 12. Alle sjekker bestått
  return {
    allowed: true,
    limits,
    preTradePositionPct,
    postTradePositionPct,
    preTradeExposurePct,
    postTradeExposurePct,
    dailyLossPct: dailyLossCheck.dailyLossPct,
  };
}

async function checkBotHealth(
  supabase: SupabaseClient,
  botId: string,
): Promise<RiskCheckResult> {
  const { data: botHealth } = await supabase
    .from("bot_health")
    .select("status, last_heartbeat, consecutive_errors, max_consecutive_errors")
    .eq("id", botId)
    .single();

  if (!botHealth) {
    return {
      allowed: false,
      rejectionReason: "BOT_NOT_HEALTHY",
      rejectionDetails: { message: "Bot not found" },
    };
  }

  if (botHealth.status !== "running") {
    return {
      allowed: false,
      rejectionReason: "BOT_NOT_HEALTHY",
      rejectionDetails: {
        botStatus: botHealth.status,
        message: `Bot status is ${botHealth.status}`,
      },
    };
  }

  const heartbeatAge =
    Date.now() - new Date(botHealth.last_heartbeat ?? 0).getTime();
  if (heartbeatAge > DEFAULT_HEARTBEAT_STALE_MS) {
    return {
      allowed: false,
      rejectionReason: "BOT_NOT_HEALTHY",
      rejectionDetails: {
        lastHeartbeat: botHealth.last_heartbeat,
        message: "Bot heartbeat stale (>5 min)",
      },
    };
  }

  if (
    (botHealth.consecutive_errors ?? 0) >=
    (botHealth.max_consecutive_errors || DEFAULT_MAX_CONSECUTIVE_ERRORS)
  ) {
    return {
      allowed: false,
      rejectionReason: "BOT_NOT_HEALTHY",
      rejectionDetails: {
        consecutiveErrors: botHealth.consecutive_errors,
        message: "Too many consecutive errors",
      },
    };
  }

  return { allowed: true };
}

async function checkDailyLoss(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  currentCapital: number,
  estimatedCost: number,
  maxDailyLossPct: number,
): Promise<{ allowed: boolean; rejectionReason?: RejectionReason; rejectionDetails?: Record<string, unknown>; dailyLossPct?: number }> {
  const { data: dailyLossResult, error: dailyLossError } = await supabase.rpc(
    "calculate_daily_loss",
    {
      p_user_id: userId,
      p_session_id: sessionId,
    },
  );

  if (dailyLossError) {
    console.error("[RiskEngine] calculate_daily_loss RPC failed:", dailyLossError);
    const errMsg =
      dailyLossError &&
      typeof dailyLossError === "object" &&
      "message" in dailyLossError
        ? String((dailyLossError as { message?: string }).message)
        : String(dailyLossError);
    logError(
      new Error(`calculate_daily_loss RPC failed: ${errMsg}`),
      {
        domain: "risk_engine",
        rpc: "calculate_daily_loss",
        rejectionReason: "DAILY_LOSS_CHECK_FAILED",
        userId,
        sessionId,
      },
      "error",
    );
    return {
      allowed: false,
      rejectionReason: "DAILY_LOSS_CHECK_FAILED",
      rejectionDetails: {
        error: dailyLossError.message,
        message: "Could not verify daily loss limit - trade blocked for safety",
      },
    };
  }

  if (dailyLossResult === null || dailyLossResult === undefined) {
    console.error("[RiskEngine] calculate_daily_loss returned null/undefined");
    logError(
      "calculate_daily_loss returned null/undefined",
      {
        domain: "risk_engine",
        rpc: "calculate_daily_loss",
        rejectionReason: "DAILY_LOSS_CHECK_FAILED",
        userId,
        sessionId,
      },
      "warning",
    );
    return {
      allowed: false,
      rejectionReason: "DAILY_LOSS_CHECK_FAILED",
      rejectionDetails: {
        message: "Daily loss calculation unavailable - trade blocked for safety",
      },
    };
  }

  const dailyLoss = Number(dailyLossResult);
  const dailyLossPct = currentCapital > 0 ? (dailyLoss / currentCapital) * 100 : 0;
  const projectedDailyLossPct = currentCapital > 0
    ? ((dailyLoss + estimatedCost) / currentCapital) * 100
    : 0;

  if (projectedDailyLossPct > maxDailyLossPct) {
    return {
      allowed: false,
      rejectionReason: "DAILY_LOSS_LIMIT_EXCEEDED",
      rejectionDetails: {
        maxAllowed: maxDailyLossPct,
        currentDailyLoss: dailyLossPct,
        projectedLoss: projectedDailyLossPct,
      },
      dailyLossPct,
    };
  }

  return { allowed: true, dailyLossPct };
}
