import { createServerClient } from "@/lib/supabase/server";
import { maxActiveTradingSessions } from "@/lib/trading/session-limits";
import type { TierSlug } from "@/lib/pricing/tiers";
import { mapRiskLevelToConfig, RISK_LEVELS } from "@/lib/auto-trading/risk-levels";
import { getOptimizedRiskProfile } from "@/lib/config/optimized-risk-profiles";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const paperTradeSchema = z.object({
  strategy: z.enum(["dca", "trend", "grid", "multi", "ai-copy"]).default("dca"),
  risk_level: z.enum(["low", "medium", "high"]).default("medium"),
  pairs: z.array(z.string()).default(["BTCUSDT"]),
  starting_capital_nok: z.number().min(10000).max(1000000).default(100000),
});

type StartPaperBotResponse = {
  ok: boolean;
  code:
    | "PAPER_BOT_STARTED"
    | "PAPER_BOT_SESSION_LIMIT"
    | "PAPER_BOT_DUPLICATE"
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

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabase = createServerClient(request, response);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<StartPaperBotResponse>(
        {
          ok: false,
          code: "UNAUTHORIZED",
          message: "Unauthorized",
          error: "Unauthorized",
          next_step: "retry",
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = paperTradeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<StartPaperBotResponse>(
        {
          ok: false,
          code: "VALIDATION_FAILED",
          message: "Validation failed",
          error: "Validation failed",
          details: parsed.error.flatten(),
          next_step: "retry",
        },
        { status: 400 },
      );
    }

    const {
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
      console.error("[auto-trading/paper] profile:", profErr.message);
    }

    const tier = (profRow?.tier ?? "student") as TierSlug;
    const maxSessions = maxActiveTradingSessions(tier, "paper");

    const { count: activeCount, error: countErr } = await supabase
      .from("trading_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("mode", "paper")
      .eq("status", "active");

    if (countErr) {
      console.error("[auto-trading/paper] count:", countErr.message);
    }

    const nActive = activeCount ?? 0;
    if (nActive >= maxSessions) {
      return NextResponse.json<StartPaperBotResponse>(
        {
          ok: false,
          code: "PAPER_BOT_SESSION_LIMIT",
          message: "Maximum number of active paper bot sessions reached",
          error: "Maximum number of active paper bot sessions reached",
          max_sessions: maxSessions,
          next_step: "retry",
        },
        { status: 403 },
      );
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

    const { data, error } = await supabase
      .from("trading_sessions")
      .insert({
        user_id: user.id,
        mode: "paper",
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
      // Supabase returns code '23505' for unique constraint violations
      const pgCode = (error as { code?: string }).code;
      if (pgCode === "23505") {
        return NextResponse.json<StartPaperBotResponse>(
          {
            ok: false,
            code: "PAPER_BOT_DUPLICATE",
            message: "Du har allerede en aktiv sesjon for dette paret og strategien.",
            error: "Du har allerede en aktiv sesjon for dette paret og strategien.",
            next_step: "retry",
          },
          { status: 409 },
        );
      }
      throw error;
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
      console.error("[auto-trading/paper] auto_trade_settings upsert:", settingsErr.message);
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
      console.error("[auto-trading/paper] wallet upsert:", walletErr.message);
    }

    return NextResponse.json<StartPaperBotResponse>({
      ok: true,
      code: "PAPER_BOT_STARTED",
      message: "Paper bot started successfully",
      session_id: data.id,
      next_step: "open_bot_details",
    });
  } catch (error) {
    console.error("[auto-trading/paper POST] Error:", error);
    const msg =
      error instanceof Error ? error.message : "Ukjent feil ved oppstart av bot";
    return NextResponse.json<StartPaperBotResponse>(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message: msg,
        error: msg,
        next_step: "retry",
      },
      { status: 500 },
    );
  }
}
