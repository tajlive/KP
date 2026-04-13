import { createServerClient } from "@/lib/supabase/server";
import { maxActiveTradingSessions } from "@/lib/trading/session-limits";
import type { TierSlug } from "@/lib/pricing/tiers";
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

    const { data, error } = await supabase
      .from("trading_sessions")
      .insert({
        user_id: user.id,
        mode: "paper",
        status: "active",
        strategy_id: strategy,
        strategy_config: { risk_level, pairs },
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
            code: "PAPER_BOT_SESSION_LIMIT",
            message: "Du har allerede en aktiv sesjon for dette paret og strategien.",
            error: "Du har allerede en aktiv sesjon for dette paret og strategien.",
            max_sessions: maxSessions,
            next_step: "retry",
          },
          { status: 409 },
        );
      }
      throw error;
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
