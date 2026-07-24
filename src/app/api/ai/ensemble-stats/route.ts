import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/ai/ensemble-stats — ensemble-AI dashboard: agent-stats,
 * ensemble-signaler (siste 24t) og feature-store.
 *
 * KLA-auth: EnsembleAIDashboard leste via browser-supabase (alltid anon →
 * stille 0 rader). I tillegg ordnet komponenten ai_agent_stats på
 * `updated_at` — kolonnen heter `last_updated_at` (latent feil, verifisert
 * mot information_schema 2026-07-24).
 */
export async function GET(_request: NextRequest) {
  try {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Ikke autentisert" },
        { status: 401 },
      );
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [statsRes, signalsRes, featuresRes] = await Promise.all([
      supabase
        .from("ai_agent_stats")
        .select("*")
        .eq("timeframe", "1h")
        .order("last_updated_at", { ascending: false }),
      supabase
        .from("trading_signals")
        .select("*")
        .eq("signal_type", "ensemble_ai")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("ai_feature_store")
        .select("*")
        .eq("timeframe", "1h")
        .order("as_of", { ascending: false })
        .limit(20),
    ]);

    return NextResponse.json({
      ok: true,
      stats: statsRes.data ?? [],
      signals: signalsRes.data ?? [],
      features: featuresRes.data ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
