/**
 * KLA-137: Trading Safety Core - Risk Validator
 * 
 * Server-side risk validation for all trades.
 * FAIL CLOSED principle: if data missing or checks fail, trade is blocked.
 */

import { createClient } from "@/lib/supabase/server";

export type RejectionReason =
  | "NO_RISK_PROFILE"
  | "BOT_NOT_HEALTHY"
  | "LIVE_NOT_ALLOWED"
  | "POSITION_LIMIT_EXCEEDED"
  | "EXPOSURE_LIMIT_EXCEEDED"
  | "DAILY_LOSS_LIMIT_EXCEEDED"
  | "DAILY_LOSS_CHECK_FAILED"
  | "PAIR_NOT_ALLOWED"
  | "LEVERAGE_NOT_ALLOWED"
  | "INSUFFICIENT_BALANCE"
  | "SESSION_NOT_ACTIVE"
  | "INVALID_TRADING_MODE";

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
  trade: TradeRequest
): Promise<RiskValidationResult> {
  const supabase = await createClient();

  try {
    // 1. Hent session info
    const { data: session, error: sessionError } = await supabase
      .from("trading_sessions")
      .select("id, user_id, mode, status, current_capital_nok, starting_capital_nok")
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

    if (session.status !== "active") {
      return {
        allowed: false,
        rejectionReason: "SESSION_NOT_ACTIVE",
        rejectionDetails: { 
          sessionStatus: session.status,
          message: `Session is ${session.status}, cannot execute trades` 
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

    // 3. Hent aktiv risk profile
    const { data: riskProfile, error: riskError } = await supabase
      .from("risk_profiles")
      .select("id, name, max_position_pct, max_exposure_pct, max_daily_loss_pct, allowed_pairs, leverage_allowed")
      .eq("user_id", trade.userId)
      .eq("is_active", true)
      .single();

    if (riskError || !riskProfile) {
      // For paper trading: default til forsiktig hvis ingen profil
      if (trade.tradingMode === "paper") {
        console.warn(`[RiskValidator] No active risk profile for user ${trade.userId}, using default conservative`);
        // Fortsett med default verdier
      } else {
        // For live trading: krev eksplisitt profil
        return {
          allowed: false,
          rejectionReason: "NO_RISK_PROFILE",
          rejectionDetails: { 
            message: "Live trading requires explicit risk profile selection" 
          },
        };
      }
    }

    const profile: RiskProfile = riskProfile || {
      id: "default",
      name: "forsiktig",
      max_position_pct: 2.0,
      max_exposure_pct: 5.0,
      max_daily_loss_pct: 1.0,
      allowed_pairs: ["BTCUSDT", "ETHUSDT"],
      leverage_allowed: false,
    };

    // 4. Sjekk bot health hvis botId er spesifisert
    if (trade.botId) {
      const { data: botHealth } = await supabase
        .from("bot_health")
        .select("status, last_heartbeat, consecutive_errors, max_consecutive_errors")
        .eq("id", trade.botId)
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
            message: `Bot status is ${botHealth.status}` 
          },
        };
      }

      // Sjekk heartbeat (maks 5 minutter gammel)
      const heartbeatAge = Date.now() - new Date(botHealth.last_heartbeat).getTime();
      if (heartbeatAge > 5 * 60 * 1000) {
        return {
          allowed: false,
          rejectionReason: "BOT_NOT_HEALTHY",
          rejectionDetails: { 
            lastHeartbeat: botHealth.last_heartbeat,
            message: "Bot heartbeat stale (>5 min)" 
          },
        };
      }

      // Sjekk consecutive errors
      if (botHealth.consecutive_errors >= (botHealth.max_consecutive_errors || 3)) {
        return {
          allowed: false,
          rejectionReason: "BOT_NOT_HEALTHY",
          rejectionDetails: { 
            consecutiveErrors: botHealth.consecutive_errors,
            message: "Too many consecutive errors" 
          },
        };
      }
    }

    // 5. Sjekk allowed pairs
    const normalizedSymbol = trade.symbol.toUpperCase().replace("/", "");
    if (!profile.allowed_pairs.includes(normalizedSymbol)) {
      return {
        allowed: false,
        rejectionReason: "PAIR_NOT_ALLOWED",
        rejectionDetails: {
          symbol: normalizedSymbol,
          allowedPairs: profile.allowed_pairs,
        },
      };
    }

    // 6. Beregn nøkkeltall
    const currentCapital = Number(session.current_capital_nok);
    const orderValue = trade.quantity * trade.price;
    
    // Hent eksisterende posisjoner for eksponering
    const { data: positions } = await supabase
      .from("positions")
      .select("symbol, quantity, avg_entry_price")
      .eq("session_id", trade.sessionId);

    const currentExposure = (positions || []).reduce((sum, pos) => {
      return sum + (Number(pos.quantity) * Number(pos.avg_entry_price));
    }, 0);

    const existingPosition = positions?.find(p => p.symbol === trade.symbol);
    const existingPositionValue = existingPosition 
      ? Number(existingPosition.quantity) * Number(existingPosition.avg_entry_price)
      : 0;

    // Beregn post-trade verdier
    let postTradePositionValue: number;
    if (trade.side === "buy") {
      postTradePositionValue = existingPositionValue + orderValue;
    } else {
      postTradePositionValue = Math.max(0, existingPositionValue - orderValue);
    }

    const postTradeExposure = trade.side === "buy"
      ? currentExposure + orderValue
      : currentExposure - Math.min(orderValue, existingPositionValue);

    const preTradePositionPct = (existingPositionValue / currentCapital) * 100;
    const postTradePositionPct = (postTradePositionValue / currentCapital) * 100;
    const preTradeExposurePct = (currentExposure / currentCapital) * 100;
    const postTradeExposurePct = (postTradeExposure / currentCapital) * 100;

    // 7. Sjekk position limit
    if (postTradePositionPct > profile.max_position_pct) {
      return {
        allowed: false,
        rejectionReason: "POSITION_LIMIT_EXCEEDED",
        rejectionDetails: {
          maxAllowed: profile.max_position_pct,
          postTradePosition: postTradePositionPct,
          orderValue,
        },
        riskProfileId: profile.id,
        preTradePositionPct,
        postTradePositionPct,
      };
    }

    // 8. Sjekk exposure limit
    if (postTradeExposurePct > profile.max_exposure_pct) {
      return {
        allowed: false,
        rejectionReason: "EXPOSURE_LIMIT_EXCEEDED",
        rejectionDetails: {
          maxAllowed: profile.max_exposure_pct,
          postTradeExposure: postTradeExposurePct,
        },
        riskProfileId: profile.id,
        preTradeExposurePct,
        postTradeExposurePct,
      };
    }

    // 9. Sjekk daily loss limit
    const { data: dailyLossResult, error: dailyLossError } = await supabase.rpc("calculate_daily_loss", {
      p_user_id: trade.userId,
      p_session_id: trade.sessionId,
    });

    // FAIL CLOSED: Hvis daily loss check feiler, blokker trade
    if (dailyLossError) {
      console.error("[RiskValidator] calculate_daily_loss RPC failed:", dailyLossError);
      return {
        allowed: false,
        rejectionReason: "DAILY_LOSS_CHECK_FAILED",
        rejectionDetails: {
          error: dailyLossError.message,
          message: "Could not verify daily loss limit - trade blocked for safety",
        },
        riskProfileId: profile.id,
      };
    }

    // FAIL CLOSED: Hvis resultat er null/undefined (f.eks. funksjonen finnes ikke), blokker trade
    if (dailyLossResult === null || dailyLossResult === undefined) {
      console.error("[RiskValidator] calculate_daily_loss returned null/undefined");
      return {
        allowed: false,
        rejectionReason: "DAILY_LOSS_CHECK_FAILED",
        rejectionDetails: {
          message: "Daily loss calculation unavailable - trade blocked for safety",
        },
        riskProfileId: profile.id,
      };
    }

    const dailyLoss = Number(dailyLossResult);
    const dailyLossPct = (dailyLoss / currentCapital) * 100;

    // Estimer tap på denne trade (conservative estimate)
    const estimatedSlippage = 0.001; // 0.1%
    const estimatedFees = 0.001; // 0.1%
    const estimatedLoss = orderValue * (estimatedSlippage + estimatedFees);
    const projectedDailyLossPct = ((dailyLoss + estimatedLoss) / currentCapital) * 100;

    if (projectedDailyLossPct > profile.max_daily_loss_pct) {
      return {
        allowed: false,
        rejectionReason: "DAILY_LOSS_LIMIT_EXCEEDED",
        rejectionDetails: {
          maxAllowed: profile.max_daily_loss_pct,
          currentDailyLoss: dailyLossPct,
          projectedLoss: projectedDailyLossPct,
        },
        riskProfileId: profile.id,
        dailyLossPct,
      };
    }

    // 10. Sjekk balance for buy orders
    if (trade.side === "buy" && orderValue > currentCapital) {
      return {
        allowed: false,
        rejectionReason: "INSUFFICIENT_BALANCE",
        rejectionDetails: {
          required: orderValue,
          available: currentCapital,
        },
      };
    }

    // 11. Alle sjekker bestått
    return {
      allowed: true,
      riskProfileId: profile.id,
      preTradePositionPct,
      postTradePositionPct,
      preTradeExposurePct,
      postTradeExposurePct,
      dailyLossPct,
    };

  } catch (error) {
    console.error("[RiskValidator] Unexpected error:", error);
    // FAIL CLOSED
    return {
      allowed: false,
      rejectionReason: "SESSION_NOT_ACTIVE",
      rejectionDetails: { 
        error: error instanceof Error ? error.message : "Unknown validation error" 
      },
    };
  }
}

/**
 * Record a trade rejection for audit trail
 */
export async function recordTradeRejection(
  trade: TradeRequest,
  result: RiskValidationResult
): Promise<void> {
  if (result.allowed) return;

  const supabase = await createClient();

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
      rejection_reason: result.rejectionReason,
      rejection_details: result.rejectionDetails || {},
      risk_profile_id: result.riskProfileId,
      bot_id: trade.botId,
    });

    console.warn(`[TradeRejection] ${result.rejectionReason} for user ${trade.userId}`, {
      symbol: trade.symbol,
      side: trade.side,
      details: result.rejectionDetails,
    });
  } catch (error) {
    // Logg men ikke kast - rejection er allerede skjedd
    console.error("[TradeRejection] Failed to record rejection:", error);
  }
}

/**
 * Record a trade decision (allow/reject) for audit trail
 */
export async function recordTradeDecision(
  trade: TradeRequest,
  result: RiskValidationResult,
  executedQuantity?: number,
  executedPrice?: number
): Promise<void> {
  const supabase = await createClient();

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
