/**
 * KLA-137: Trading Safety Core - Risk Validator
 *
 * Server-side risk validation for all trades.
 * FAIL CLOSED principle: if data missing or checks fail, trade is blocked.
 *
 * Denne filen er nå en tynn adapter rundt den kanoniske risk-engine
 * (src/lib/trading/canonical/risk/risk-engine.ts). All valideringslogikk
 * ligger i den kanoniske motoren og er identisk for test og live.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/types/database.types";
import { getUsdtToNokRateAsync, usdtToNok } from "@/lib/trading/currency";
import {
  checkTradeRisk,
  type RawRiskProfile,
  type RiskCheckRequest,
  type RiskCheckResult,
  type SessionInfo,
} from "@/lib/trading/canonical/risk";

export type RejectionReason =
  | NonNullable<RiskCheckResult["rejectionReason"]>
  | "LIVE_NOT_ALLOWED";

export interface RiskValidationResult {
  allowed: boolean;
  rejectionReason?: RejectionReason;
  rejectionDetails?: Record<string, unknown>;
  riskProfileId?: string;
  preTradePositionPct?: number;
  postTradePositionPct?: number;
  preTradeExposurePct?: number;
  postTradeExposurePct?: number;
  dailyLossPct?: number;
}

export interface TradeRequest {
  userId: string;
  sessionId: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  orderType: "market" | "limit";
  tradingMode: "paper" | "live";
  botId?: string;
}

export interface RiskProfile {
  id: string;
  name: string;
  max_position_pct: number;
  max_exposure_pct: number;
  max_daily_loss_pct: number;
  allowed_pairs: string[];
  leverage_allowed: boolean;
}

/**
 * Validate trade against risk profile and system constraints
 * FAIL CLOSED: Any error or missing data results in rejection
 */
export async function validateTradeAgainstRiskProfile(
  supabase: SupabaseClient,
  trade: TradeRequest,
): Promise<RiskValidationResult> {
  try {
    // 1. Hent session info
    const { data: session, error: sessionError } = await supabase
      .from("trading_sessions")
      .select(
        "id, user_id, mode, status, current_capital_nok, starting_capital_nok",
      )
      .eq("id", trade.sessionId)
      .eq("user_id", trade.userId)
      .single();

    if (sessionError || !session) {
      return {
        allowed: false,
        rejectionReason: "SESSION_NOT_ACTIVE",
        rejectionDetails: { error: "Session not found or access denied" },
      };
    }

    const sessionInfo: SessionInfo = {
      id: session.id,
      user_id: session.user_id,
      mode: session.mode as "paper" | "live",
      status: session.status,
      current_capital_nok: Number(session.current_capital_nok),
      starting_capital_nok: Number(session.starting_capital_nok),
    };

    // 2. Hent aktiv risk profile
    const { data: riskProfile, error: riskError } = await supabase
      .from("risk_profiles")
      .select(
        "id, name, max_position_pct, max_exposure_pct, max_daily_loss_pct, allowed_pairs, leverage_allowed",
      )
      .eq("user_id", trade.userId)
      .eq("is_active", true)
      .single();

    if (riskError && trade.tradingMode === "live") {
      return {
        allowed: false,
        rejectionReason: "NO_RISK_PROFILE",
        rejectionDetails: {
          message: "Live trading requires explicit risk profile selection",
        },
      };
    }

    if (!riskProfile && trade.tradingMode === "paper") {
      console.warn(
        `[RiskValidator] No active risk profile for user ${trade.userId}, using paper demo risk defaults`,
      );
    }

    const rawProfile: RawRiskProfile | null = riskProfile
      ? {
          id: riskProfile.id,
          name: riskProfile.name,
          max_position_pct: riskProfile.max_position_pct,
          max_exposure_pct: riskProfile.max_exposure_pct,
          max_daily_loss_pct: riskProfile.max_daily_loss_pct,
          allowed_pairs: riskProfile.allowed_pairs,
          leverage_allowed: riskProfile.leverage_allowed,
        }
      : null;

    // 3. Valutakonvertering for paper (kapital er NOK, priser fra Binance er USDT)
    const usdtNokRate =
      trade.tradingMode === "paper"
        ? await getUsdtToNokRateAsync(supabase)
        : null;
    const convertValue =
      trade.tradingMode === "paper"
        ? (usdt: number) => usdtToNok(usdt, usdtNokRate ?? undefined)
        : undefined;

    // 4. Delegat til kanonisk risk-engine
    const riskRequest: RiskCheckRequest = {
      userId: trade.userId,
      sessionId: trade.sessionId,
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      price: trade.price,
      orderType: trade.orderType,
      tradingMode: trade.tradingMode,
      botId: trade.botId,
    };

    const result = await checkTradeRisk(
      supabase,
      riskRequest,
      sessionInfo,
      rawProfile,
      { convertValue },
    );

    return {
      allowed: result.allowed,
      rejectionReason: result.rejectionReason,
      rejectionDetails: result.rejectionDetails,
      riskProfileId: result.limits?.profileId,
      preTradePositionPct: result.preTradePositionPct,
      postTradePositionPct: result.postTradePositionPct,
      preTradeExposurePct: result.preTradeExposurePct,
      postTradeExposurePct: result.postTradeExposurePct,
      dailyLossPct: result.dailyLossPct,
    };
  } catch (error) {
    console.error("[RiskValidator] Unexpected error:", error);
    // FAIL CLOSED
    return {
      allowed: false,
      rejectionReason: "SESSION_NOT_ACTIVE",
      rejectionDetails: {
        error:
          error instanceof Error ? error.message : "Unknown validation error",
      },
    };
  }
}

/**
 * Record a trade rejection for audit trail
 */
export async function recordTradeRejection(
  supabase: SupabaseClient,
  trade: TradeRequest,
  result: RiskValidationResult,
): Promise<void> {
  if (result.allowed) return;

  try {
    await supabase.from("trade_rejections").insert({
      user_id: trade.userId,
      session_id: trade.sessionId,
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      price: trade.price,
      order_type: trade.orderType,
      trading_mode: trade.tradingMode,
      rejection_reason: result.rejectionReason!,
      rejection_details: (result.rejectionDetails ?? {}) as Json,
      risk_profile_id: result.riskProfileId ?? null,
      bot_id: trade.botId ?? null,
    });

    console.warn(
      `[TradeRejection] ${result.rejectionReason} for user ${trade.userId}`,
      {
        symbol: trade.symbol,
        side: trade.side,
        details: result.rejectionDetails,
      },
    );
  } catch (error) {
    // Logg men ikke kast - rejection er allerede skjedd
    console.error("[TradeRejection] Failed to record rejection:", error);
  }
}

/**
 * Record a trade decision (allow/reject) for audit trail
 */
export async function recordTradeDecision(
  supabase: SupabaseClient,
  trade: TradeRequest,
  result: RiskValidationResult,
  executedQuantity?: number,
  executedPrice?: number,
): Promise<void> {
  try {
    await supabase.from("trade_decisions").insert({
      user_id: trade.userId,
      session_id: trade.sessionId,
      decision_type: result.allowed ? "allow" : "reject",
      trading_mode: trade.tradingMode,
      symbol: trade.symbol,
      side: trade.side,
      requested_quantity: trade.quantity,
      requested_price: trade.price,
      executed_quantity: executedQuantity,
      executed_price: executedPrice,
      risk_profile_id: result.riskProfileId,
      pre_trade_position_pct: result.preTradePositionPct,
      post_trade_position_pct: result.postTradePositionPct,
      pre_trade_exposure_pct: result.preTradeExposurePct,
      post_trade_exposure_pct: result.postTradeExposurePct,
      daily_loss_pct: result.dailyLossPct,
      rejection_reason: result.rejectionReason,
    });
  } catch (error) {
    console.error("[TradeDecision] Failed to record decision:", error);
  }
}
