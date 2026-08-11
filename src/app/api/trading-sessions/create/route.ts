import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { normalizeTier } from "@/lib/pricing/tiers";
import { maxActiveTradingSessions } from "@/lib/trading/session-limits";
import { normalizePair } from "@/lib/trading/pair";
import { canAccessLiveAutoTrading, type TierSlug } from "@/types/subscription";
import { z } from "zod";

const createSessionSchema = z.object({
  trading_pair: z.string().min(1, "Trading pair er påkrevd"),
  strategy_id: z.string().optional(),
  starting_capital_nok: z.number().min(1000).max(100000).optional(),
  mode: z.enum(["paper", "live"]).optional().default("paper"),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabase = createServerClient(request, response);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      console.error(
        "[trading-sessions/create] validation failed:",
        parsed.error.flatten(),
      );
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_FAILED",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { trading_pair, strategy_id } = parsed.data;
    const mode = parsed.data.mode;
    const requested = parsed.data.starting_capital_nok;

    // P1-fiks (2026-08-11): kapital må komme fra FRI kapital, aldri settes
    // blindt til 100 000/hele saldoen. To aktive sesjoner som deler samme
    // saldo → syncPaperAccountBalance summerer begge → balanse-inflasjon
    // (K3-observasjon 199 294 ≈ 2×100k, samme feilklasse som P0).
    let capital: number;
    if (mode === "paper") {
      const { data: account } = await supabase
        .from("paper_accounts")
        .select("current_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      const balance = Number(account?.current_balance ?? 10000);

      const { data: liveSessions } = await supabase
        .from("trading_sessions")
        .select("current_capital_nok")
        .eq("user_id", user.id)
        .eq("mode", "paper")
        .in("status", ["active", "paused"]);
      const allocated = (liveSessions ?? []).reduce(
        (sum, s) => sum + Number(s.current_capital_nok ?? 0),
        0,
      );
      const free = Math.max(0, balance - allocated);

      capital = requested != null ? Math.min(requested, free) : free;

      if (capital < 1000) {
        return NextResponse.json(
          {
            error:
              "Ikke nok ledig kapital til ny sesjon. Stopp en aktiv sesjon først.",
            code: "INSUFFICIENT_FREE_CAPITAL",
            freeCapital: Math.round(free * 100) / 100,
          },
          { status: 400 },
        );
      }
    } else {
      capital = requested ?? 10000; // live: kun posisjonsstørrelse teller
    }

    const { data: profRow, error: profFetchErr } = await supabase
      .from("user_profiles")
      .select("tier")
      .eq("id", user.id)
      .single();

    if (profFetchErr) {
      console.error(
        "[trading-sessions/create] profile fetch:",
        profFetchErr.message,
      );
    }

    const tier = normalizeTier(profRow?.tier) as TierSlug;

    if (mode === "live") {
      // EU/EØS (2026): live krever Kraken-nøkler (user_kraken_keys)
      const { data: krakenKeys } = await supabase
        .from("user_kraken_keys")
        .select("user_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!krakenKeys) {
        return NextResponse.json(
          {
            error: "Live krever tilkoblet Kraken-konto",
            code: "LIVE_KRAKEN_REQUIRED",
          },
          { status: 403 },
        );
      }

      if (!canAccessLiveAutoTrading(tier)) {
        return NextResponse.json(
          {
            error: "Live trading krever Bachelor-tier eller høyere",
            code: "LIVE_TIER_REQUIRED",
          },
          { status: 403 },
        );
      }

      const { data: entitlements } = await supabase.rpc(
        "get_user_entitlements",
        { p_user_id: user.id },
      );
      const ent = entitlements?.[0] as
        | { auto_trade_allow_live?: boolean }
        | undefined;
      if (ent && !ent.auto_trade_allow_live) {
        return NextResponse.json(
          {
            error: "Live trading er ikke aktivert for abonnementet ditt",
            code: "LIVE_ENTITLEMENT_REQUIRED",
          },
          { status: 403 },
        );
      }
    }

    const maxSessions = maxActiveTradingSessions(tier, mode);
    if (maxSessions <= 0) {
      return NextResponse.json(
        {
          error: "Ingen tilgang til ny sesjon i denne modusen",
          code: "NO_SESSION_ACCESS",
        },
        { status: 403 },
      );
    }

    const { count: activeCount, error: countErr } = await supabase
      .from("trading_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("mode", mode)
      .eq("status", "active");

    if (countErr) {
      console.error("[trading-sessions/create] count:", countErr.message);
    }

    const nActive = activeCount ?? 0;
    if (nActive >= maxSessions) {
      const { data: existing } = await supabase
        .from("trading_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("mode", mode)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return NextResponse.json(
        {
          success: false,
          code: "MAX_ACTIVE_SESSIONS",
          max: maxSessions,
          tier,
          session_id: existing?.id ?? null,
        },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();

    // Opprett trading session (paper + live bruker samme tabell; capital i både NOK-felt og legacy capital)
    const result = await supabase
      .from("trading_sessions")
      .insert({
        user_id: user.id,
        mode,
        status: "active",
        trading_pair: normalizePair(trading_pair),
        strategy_id: strategy_id || "dca",
        strategy_config: {},
        current_capital_nok: capital,
        starting_capital_nok: capital,
        initial_capital: capital,
        current_capital: capital,
        total_pnl: 0,
        winning_trades: 0,
        losing_trades: 0,
        total_trades: 0,
        started_at: now,
        last_heartbeat: now,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    const session = result.data as { id: string } | null;
    const insertError = result.error;

    if (insertError || !session) {
      console.error("[trading-sessions/create] insert failed:", insertError);
      return NextResponse.json(
        {
          error: "Kunne ikke opprette trading session",
          code: "CREATE_FAILED",
          details: insertError ? { message: insertError.message } : null,
        },
        { status: 500 },
      );
    }

    // Logg aktivitet (activity_logs finnes ikke i genererte typer i alle miljøer)
    await supabase.from("activity_logs" as never).insert({
      user_id: user.id,
      action: "paper_trading_session_created",
      details: {
        session_id: session.id,
        trading_pair: normalizePair(trading_pair),
        starting_capital_nok: capital,
      },
    } as never);

    return NextResponse.json({
      success: true,
      session_id: session.id,
      session,
    });
  } catch (error) {
    console.error("Unexpected error in create trading session:", error);
    return NextResponse.json(
      { error: "Uventet feil", code: "UNEXPECTED_ERROR" },
      { status: 500 },
    );
  }
}
