import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/user/auto-trading-config — les auto-trading-konfig for innlogget bruker.
 * PUT  /api/user/auto-trading-config — opprett/oppdater konfig (whitelistet).
 *
 * KLA-auth: Browser-supabase er alltid anon (httpOnly auth-cookie), så
 * AutoTradingConfigCard kan ikke lese/skrive user_auto_trading_configs direkte.
 * Kolonner verifisert mot information_schema 2026-07-24.
 */

const SELECT = "is_enabled, is_paper_trading, trading_capital_nok, risk_level";

const RISK_LEVELS = new Set(["low", "medium", "high"]);

async function getAuthedSupabase() {
  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Ikke innlogget" },
        { status: 401 },
      );
    }

    const { data, error } = await supabase
      .from("user_auto_trading_configs")
      .select(SELECT)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, config: data ?? null });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Ikke innlogget" },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      is_enabled?: unknown;
      is_paper_trading?: unknown;
      trading_capital_nok?: unknown;
      risk_level?: unknown;
    } | null;
    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Ugyldig JSON-body" },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    if (typeof body.is_enabled === "boolean") {
      updates.is_enabled = body.is_enabled;
    }
    if (typeof body.is_paper_trading === "boolean") {
      updates.is_paper_trading = body.is_paper_trading;
    }
    if (
      typeof body.trading_capital_nok === "number" &&
      Number.isFinite(body.trading_capital_nok) &&
      body.trading_capital_nok > 0
    ) {
      updates.trading_capital_nok = body.trading_capital_nok;
    }
    if (
      typeof body.risk_level === "string" &&
      RISK_LEVELS.has(body.risk_level)
    ) {
      updates.risk_level = body.risk_level;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { ok: false, error: "Ingen gyldige felt i body" },
        { status: 400 },
      );
    }

    // Update hvis rad finnes, ellers insert (user_id MÅ med — RLS-fellen)
    const { data: existing } = await supabase
      .from("user_auto_trading_configs")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("user_auto_trading_configs")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", existing.id));
    } else {
      // strategy_id er NOT NULL i typene men refererer til auto_strategies
      // som ikke finnes — utelates bevisst (insert feiler synlig ved NOT NULL
      // uten default, heller enn stille som via anon-klienten)
      ({ error } = await supabase.from("user_auto_trading_configs").insert({
        user_id: user.id,
        ...updates,
      } as never));
    }

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, saved: Object.keys(updates) });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
