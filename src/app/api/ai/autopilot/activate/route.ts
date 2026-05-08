/**
 * POST /api/ai/autopilot/activate
 *
 * One-Click AI Autopilot aktivering.
 * AI analyserer markedet, velger strategi, allokerer kapital, starter trading.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { runAutopilotAnalysis, type RiskAppetite } from "@/lib/ai/autopilot/decision-engine";
import { z } from "zod";
import { maxActiveTradingSessions } from "@/lib/trading/session-limits";
import type { TierSlug } from "@/lib/pricing/tiers";
import { getOptimizedRiskProfile } from "@/lib/config/optimized-risk-profiles";
import { mapRiskLevelToConfig } from "@/lib/auto-trading/risk-levels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const activateSchema = z.object({
  risk_appetite: z.enum(["conservative", "moderate", "aggressive"]).default("moderate"),
  total_capital_nok: z.number().min(10000).max(1000000).default(100000),
  max_pairs: z.number().min(1).max(5).default(3),
});

// Strategy ID mapping (product ID → engine ID for trading_sessions)
const STRATEGY_TO_ENGINE: Record<string, string> = {
  dca_trygg: "dca",
  trend_balansert: "trend_follow",
  multisignal_aktiv: "multi_signal",
  grid_bot: "grid",
  ensemble_ai: "ensemble_ai",
  ai_copy: "ai_copy",
};

export async function POST(req: NextRequest) {
  const res = NextResponse.next();
  const db = createServerClient(req, res);

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Input validation
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = activateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { risk_appetite, total_capital_nok, max_pairs } = parsed.data;

  try {
    // ── 1. Tier check ────────────────────────────────────────────────────
    const { data: profile } = await db
      .from("user_profiles")
      .select("tier")
      .eq("id", user.id)
      .maybeSingle();

    const tier = (profile?.tier ?? "student") as TierSlug;
    const maxSessions = maxActiveTradingSessions(tier, "paper");

    const { count: activeCount } = await db
      .from("trading_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("mode", "paper")
      .eq("status", "active");

    if ((activeCount ?? 0) >= maxSessions) {
      return NextResponse.json(
        {
          error: "Session limit reached",
          max_sessions: maxSessions,
          active_sessions: activeCount,
        },
        { status: 429 }
      );
    }

    // ── 2. Sjekk om bruker allerede har autopilot ────────────────────────
    const { data: existingAutopilot } = await db
      .from("ai_autopilot_configs")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingAutopilot?.status === "active") {
      return NextResponse.json(
        { error: "Autopilot already active. Stop existing before starting new." },
        { status: 409 }
      );
    }

    // ── 3. AI-analyse ────────────────────────────────────────────────────
    const decision = await runAutopilotAnalysis(
      risk_appetite as RiskAppetite,
      total_capital_nok,
      max_pairs,
      db
    );

    // Hvis ingen signaler (f.eks. crash regime), ikke start
    if (decision.pairs.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          regime: decision.regime,
          reason: "No qualifying signals. Market conditions unfavorable.",
          strategy: decision.strategy,
        },
        { status: 200 }
      );
    }

    // ── 4. Opprett autopilot config ──────────────────────────────────────
    const now = new Date().toISOString();
    const { data: autopilotConfig, error: autopilotErr } = await db
      .from("ai_autopilot_configs")
      .upsert(
        {
          user_id: user.id,
          risk_appetite,
          total_capital_nok,
          max_pairs,
          detected_regime: decision.regime,
          selected_strategy: decision.strategy,
          selected_pairs: decision.pairs.map((p) => p.symbol),
          capital_per_pair: Object.fromEntries(
            decision.pairs.map((p) => [p.symbol, p.capital_nok])
          ),
          status: "active",
          started_at: now,
          last_rebalance_at: now,
          updated_at: now,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (autopilotErr) {
      console.error("[Autopilot] Config insert failed:", autopilotErr.message);
      return NextResponse.json(
        { error: "Failed to create autopilot config", details: autopilotErr.message },
        { status: 500 }
      );
    }

    // ── 5. Opprett trading sessions (koblet til autopilot) ───────────────
    const riskProfile = getOptimizedRiskProfile(
      risk_appetite === "conservative"
        ? "conservative"
        : risk_appetite === "moderate"
          ? "moderate"
          : "aggressive"
    );

    const riskConfig = mapRiskLevelToConfig(
      risk_appetite === "conservative"
        ? "safe"
        : risk_appetite === "moderate"
          ? "balanced"
          : "offensive"
    );

    const sessionIds: string[] = [];

    for (const pairAlloc of decision.pairs) {
      const strategyConfig: Record<string, unknown> = {
        risk_level: risk_appetite,
        pairs: [pairAlloc.symbol],
        risk_config: riskConfig,
        autopilot: true,
        confidence: pairAlloc.confidence,
      };

      // Strategy-specific defaults
      const engineKey = STRATEGY_TO_ENGINE[decision.strategy] ?? "multi_signal";
      if (decision.strategy === "grid_bot") {
        strategyConfig.grid_config = {
          levels: 10,
          volatility_adjust: true,
        };
      }

      const { data: session, error: sessionErr } = await db
        .from("trading_sessions")
        .insert({
          user_id: user.id,
          autopilot_id: autopilotConfig.id,
          mode: "paper",
          status: "active",
          strategy_id: engineKey,
          strategy_config: strategyConfig as never,
          starting_capital_nok: pairAlloc.capital_nok,
          current_capital_nok: pairAlloc.capital_nok,
          trading_pair: pairAlloc.symbol,
          initial_capital: pairAlloc.capital_nok,
          current_capital: pairAlloc.capital_nok,
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

      if (sessionErr) {
        console.error(`[Autopilot] Session create failed for ${pairAlloc.symbol}:`, sessionErr.message);
        continue;
      }

      sessionIds.push(session.id);
    }

    // ── 6. Oppdater auto_trade_settings ──────────────────────────────────
    await db.from("auto_trade_settings").upsert(
      {
        user_id: user.id,
        auto_trading_enabled: true,
        risk_profile: risk_appetite,
        max_position_percent: riskProfile.maxPositionSizePercent,
        daily_loss_limit_percent: riskProfile.maxDailyLossPercent,
        daily_trade_limit: riskProfile.maxTradesPerDay,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

    // ── 7. Wallet ────────────────────────────────────────────────────────
    await db.from("wallets").upsert(
      {
        user_id: user.id,
        currency: "NOK",
        balance: total_capital_nok,
        updated_at: now,
      },
      { onConflict: "user_id,currency" }
    );

    return NextResponse.json({
      ok: true,
      autopilot_id: autopilotConfig.id,
      regime: decision.regime,
      regime_confidence: decision.regime_confidence,
      strategy: decision.strategy,
      strategy_reason: decision.strategy_reason,
      pairs: decision.pairs,
      session_ids: sessionIds,
      message: `Autopilot activated with ${decision.strategy} strategy in ${decision.regime} regime`,
    });
  } catch (error) {
    console.error("[Autopilot Activate] Unexpected error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
