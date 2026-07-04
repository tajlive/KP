"use server";

import { createServerClient } from "@/lib/supabase/server";
import { maxActiveTradingSessions } from "@/lib/trading/session-limits";
import type { TierSlug } from "@/lib/pricing/tiers";
import { ExecutorFactory } from "@/lib/trading/executor-factory";
import { mapRiskLevelToConfig, RISK_LEVELS } from "@/lib/auto-trading/risk-levels";
import { getOptimizedRiskProfile } from "@/lib/config/optimized-risk-profiles";
import { executeTrade } from "@/lib/trading/core/execute-trade";
import { z } from "zod";
import { clampDCAConfig } from "@/lib/trading/dca-validation";

const tradingStartSchema = z.object({
  mode: z.enum(["paper", "live"]),
  strategy: z.enum(["dca", "trend", "grid", "multi", "ai-copy"]).default("dca"),
  risk_level: z
    .enum(["low", "medium", "high", "safe", "balanced", "offensive", "aggressive"])
    .transform((val) => {
      const map: Record<string, "low" | "medium" | "high"> = {
        safe: "low",
        balanced: "medium",
        offensive: "high",
        aggressive: "high",
        low: "low",
        medium: "medium",
        high: "high",
      };
      return map[val];
    })
    .default("medium"),
  pairs: z.array(z.string()).default(["BTCUSDT"]),
  starting_capital_nok: z.number().min(10000).max(1000000).default(100000),
});

/** @deprecated Use TradingStartInput instead. */
export type PaperTradeInput = z.input<typeof tradingStartSchema>;
export type TradingStartInput = z.input<typeof tradingStartSchema>;

export type StartTradingBotResponse = {
  ok: boolean;
  code:
    | "PAPER_BOT_STARTED"
    | "LIVE_BOT_STARTED"
    | "PAPER_BOT_SESSION_LIMIT"
    | "LIVE_BOT_SESSION_LIMIT"
    | "PAPER_BOT_DUPLICATE"
    | "LIVE_BOT_DUPLICATE"
    | "LIVE_NOT_ALLOWED"
    | "BINANCE_NOT_CONNECTED"
    | "UNAUTHORIZED"
    | "VALIDATION_FAILED"
    | "INTERNAL_ERROR";
  message: string;
  session_id?: string;
  next_step?: "open_bot_details" | "retry";
  error?: string;
  max_sessions?: number;
  details?: unknown;
};

/** @deprecated Use StartTradingBotResponse instead. */
export type StartPaperBotResponse = StartTradingBotResponse;

export async function startTrading(
  data: TradingStartInput
): Promise<StartTradingBotResponse> {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Unauthorized",
        error: "Unauthorized",
        next_step: "retry",
      };
    }

    const parsed = tradingStartSchema.safeParse(data);
    if (!parsed.success) {
      return {
        ok: false,
        code: "VALIDATION_FAILED",
        message: "Validation failed",
        error: "Validation failed",
        details: parsed.error.flatten(),
        next_step: "retry",
      };
    }

    const {
      mode,
      strategy,
      risk_level,
      pairs,
      starting_capital_nok: startingCapital,
    } = parsed.data;

    const { data: profRow, error: profErr } = await supabase
      .from("user_profiles")
      .select("tier")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr) {
      console.error("[actions/trading] profile:", profErr.message);
    }

    const tier = (profRow?.tier ?? "student") as TierSlug;

    // Live trading requires Bachelor+ tier and a connected Binance account.
    if (mode === "live") {
      const canLive = await ExecutorFactory.canTradeLive(supabase, user.id);
      if (!canLive) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("tier, binance_connected")
          .eq("id", user.id)
          .maybeSingle();

        const allowedTiers = ["bachelor", "master", "phd", "professor"];
        const tierAllowed = allowedTiers.includes(profile?.tier ?? "");
        const binanceConnected = profile?.binance_connected ?? false;

        if (!tierAllowed) {
          return {
            ok: false,
            code: "LIVE_NOT_ALLOWED",
            message: "Live trading requires Bachelor tier or higher",
            error: "Live trading requires Bachelor tier or higher",
            next_step: "retry",
          };
        }
        if (!binanceConnected) {
          return {
            ok: false,
            code: "BINANCE_NOT_CONNECTED",
            message: "Binance API keys not configured. Please connect your exchange first.",
            error: "Binance API keys not configured. Please connect your exchange first.",
            next_step: "retry",
          };
        }
      }
    }

    const maxSessions = maxActiveTradingSessions(tier, mode);

    const { count: activeCount, error: countErr } = await supabase
      .from("trading_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("mode", mode)
      .eq("status", "active");

    if (countErr) {
      console.error("[actions/trading] count:", countErr.message);
    }

    const nActive = activeCount ?? 0;
    if (nActive >= maxSessions) {
      return {
        ok: false,
        code: mode === "live" ? "LIVE_BOT_SESSION_LIMIT" : "PAPER_BOT_SESSION_LIMIT",
        message: `Maximum number of active ${mode} bot sessions reached`,
        error: `Maximum number of active ${mode} bot sessions reached`,
        max_sessions: maxSessions,
        next_step: "retry",
      };
    }

    const now = new Date().toISOString();

    // Map wizard risk level (low/medium/high) to internal risk level keys
    const wizardToInternalRisk: Record<string, keyof typeof RISK_LEVELS> = {
      low: "safe",
      medium: "balanced",
      high: "offensive",
    };
    const internalRiskLevel = wizardToInternalRisk[risk_level] || "balanced";

    // Build full risk config from optimized profiles
    const riskConfig = mapRiskLevelToConfig(internalRiskLevel);
    const optimizedProfile = getOptimizedRiskProfile(
      internalRiskLevel === "safe"
        ? "conservative"
        : internalRiskLevel === "balanced"
          ? "moderate"
          : internalRiskLevel === "offensive"
            ? "aggressive"
            : "dynamic"
    );

    // Build strategy config with full risk_config and strategy-specific settings
    const strategyConfig: Record<string, unknown> = {
      risk_level: internalRiskLevel,
      pairs,
      risk_config: riskConfig,
    };

    // Clamp DCA-specific config to safe bounds so UI/server constraints match
    if (strategy === "dca") {
      const dcaClamped = clampDCAConfig({
        position_size: (strategyConfig.position_size as number) ?? undefined,
        interval_minutes:
          (strategyConfig.interval_minutes as number) ?? undefined,
      });
      strategyConfig.position_size = dcaClamped.position_size;
      strategyConfig.interval_minutes = dcaClamped.interval_minutes;
    }

    // For grid strategy, store fixed grid boundaries so they don't drift every tick
    if (strategy === "grid") {
      const currentPrice = startingCapital; // Approximation — actual price fetched on first tick
      const gridLevels = 10; // Default balanced grid
      const gridRangePct = 20; // ±10%
      strategyConfig.grid_config = {
        levels: gridLevels,
        upper_price: currentPrice * (1 + gridRangePct / 100 / 2),
        lower_price: currentPrice * (1 - gridRangePct / 100 / 2),
        volatility_adjust: true,
      };
    }

    // Check for existing active session for this pair — if found (e.g. default
    // session created by trigger), UPDATE it instead of failing with 23505.
    const { data: existingSession } = await supabase
      .from("trading_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("mode", mode)
      .eq("status", "active")
      .eq("trading_pair", pairs[0] || "BTCUSDT")
      .maybeSingle();

    let sessionId: string;

    if (existingSession) {
      // Update existing default session with new strategy/config
      const { data: updated, error: updateErr } = await supabase
        .from("trading_sessions")
        .update({
          strategy_id: strategy,
          strategy_config: strategyConfig as Record<string, unknown> as never,
          starting_capital_nok: startingCapital,
          current_capital_nok: startingCapital,
          initial_capital: startingCapital,
          current_capital: startingCapital,
          total_trades: 0,
          winning_trades: 0,
          losing_trades: 0,
          total_pnl: 0,
          started_at: now,
          last_heartbeat: now,
          updated_at: now,
        })
        .eq("id", existingSession.id)
        .select("id")
        .single();

      if (updateErr) {
        console.error(
          "[actions/trading] update existing session:",
          updateErr.message
        );
        throw updateErr;
      }
      sessionId = updated.id;
    } else {
      // No existing session — create new
      const { data: inserted, error } = await supabase
        .from("trading_sessions")
        .insert({
          user_id: user.id,
          mode,
          status: "active",
          strategy_id: strategy,
          strategy_config: strategyConfig as Record<string, unknown> as never,
          starting_capital_nok: startingCapital,
          current_capital_nok: startingCapital,
          trading_pair: pairs[0] || "BTCUSDT",
          initial_capital: startingCapital,
          current_capital: startingCapital,
          total_trades: 0,
          winning_trades: 0,
          losing_trades: 0,
          total_pnl: 0,
          started_at: now,
          last_heartbeat: now,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }
      sessionId = inserted.id;
    }

    // Map wizard risk level to auto_trade_settings schema
    const riskProfileMap: Record<string, string> = {
      low: "conservative",
      medium: "moderate",
      high: "aggressive",
    };

    // Ensure auto_trade_settings exists so the cron job picks up this user
    // Use actual optimized profile values instead of hardcoded defaults
    const { error: settingsErr } = await supabase
      .from("auto_trade_settings")
      .upsert(
        {
          user_id: user.id,
          auto_trading_enabled: true,
          risk_profile: riskProfileMap[risk_level] || "moderate",
          max_position_percent: optimizedProfile.maxPositionSizePercent,
          daily_loss_limit_percent: optimizedProfile.maxDailyLossPercent,
          daily_trade_limit: optimizedProfile.maxTradesPerDay,
          updated_at: now,
        },
        { onConflict: "user_id" }
      );

    if (settingsErr) {
      console.error(
        "[actions/trading] auto_trade_settings upsert:",
        settingsErr.message
      );
    }

    // Ensure wallet exists so portfolio page isn't empty
    const { error: walletErr } = await supabase
      .from("wallets")
      .upsert(
        {
          user_id: user.id,
          currency: "NOK",
          balance: startingCapital,
          updated_at: now,
        },
        { onConflict: "user_id,currency" }
      );

    if (walletErr) {
      console.error("[actions/trading] wallet upsert:", walletErr.message);
    }

    return {
      ok: true,
      code: mode === "live" ? "LIVE_BOT_STARTED" : "PAPER_BOT_STARTED",
      message: `${mode === "live" ? "Live" : "Paper"} bot started successfully`,
      session_id: sessionId,
      next_step: "open_bot_details",
    };
  } catch (error) {
    console.error("[actions/trading] Error:", error);
    const msg =
      error instanceof Error ? error.message : "Unknown error starting bot";
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: msg,
      error: msg,
      next_step: "retry",
    };
  }
}

/**
 * Backward-compatible alias for starting a paper trading bot.
 * @deprecated Use startTrading({ mode: "paper", ... }) instead.
 */
export async function startPaperTrading(
  data: Omit<TradingStartInput, "mode">
): Promise<StartTradingBotResponse> {
  return startTrading({ ...data, mode: "paper" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Execute Trade Action
// ─────────────────────────────────────────────────────────────────────────────

const executeTradeSchema = z.object({
  session_id: z.string().uuid(),
  symbol: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  order_type: z.enum(["market", "limit"]).default("market"),
  bot_id: z.string().uuid().optional(),
});

export type ExecuteTradeInput = z.infer<typeof executeTradeSchema>;

export type ExecuteTradeActionResponse =
  | {
      success: true;
      trade: {
        tradeId: string | undefined;
        orderId: string | undefined;
        symbol: string;
        side: "buy" | "sell";
        executedQuantity: number | undefined;
        executedPrice: number | undefined;
        fee: number | undefined;
      };
    }
  | {
      success: false;
      error: string;
      rejectionReason?: string;
      type?: "TRADE_REJECTED";
    };

export async function executeTradeAction(
  data: ExecuteTradeInput
): Promise<ExecuteTradeActionResponse> {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const validation = executeTradeSchema.safeParse(data);
    if (!validation.success) {
      return {
        success: false,
        error: "Invalid trade data",
      };
    }

    const { session_id, symbol, side, quantity, price, order_type, bot_id } =
      validation.data;

    // Execute live trade via unified core
    const result = await executeTrade(supabase, {
      userId: user.id,
      sessionId: session_id,
      symbol: symbol.toUpperCase(),
      side,
      quantity,
      price: price ?? 0,
      orderType: order_type,
      mode: "live",
      botId: bot_id,
    });

    if (!result.success) {
      if (result.rejectionReason) {
        return {
          success: false,
          error: result.error || "Trade rejected",
          rejectionReason: result.rejectionReason,
          type: "TRADE_REJECTED",
        };
      }
      return {
        success: false,
        error: result.error || "Live execution failed",
      };
    }

    return {
      success: true,
      trade: {
        tradeId: result.tradeId,
        orderId: result.orderId,
        symbol: symbol.toUpperCase(),
        side,
        executedQuantity: result.executedQuantity,
        executedPrice: result.executedPrice,
        fee: result.fee,
      },
    };
  } catch (error) {
    console.error("[actions/trading/execute] Unexpected error:", error);
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return { success: false, error: msg };
  }
}
