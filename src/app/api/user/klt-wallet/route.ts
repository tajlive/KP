import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/user/klt-wallet — KLT-saldo + transaksjoner + månedsrangering.
 *
 * KLA-auth: KLTWallet leste user_klt_balances / klt_transactions /
 * leaderboard_monthly via browser-supabase (alltid anon → stille 0 rader).
 *
 * MERK: Det finnes TO balansetabeller — kltbalances (32 rader, brukt av
 * /api/klt/balance) og user_klt_balances (48 rader, brukt av komponenten).
 * Denne ruten bruker user_klt_balances (komponentens kilde, flest rader).
 * Divergensen er logget som backlog-sak.
 * Tabeller/kolonner verifisert mot information_schema 2026-07-24.
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

    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const [balanceRes, txRes, rankRes] = await Promise.all([
      supabase
        .from("user_klt_balances")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("klt_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("leaderboard_monthly")
        .select("rank")
        .eq("user_id", user.id)
        .eq("month", thisMonth)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      ok: true,
      balance: balanceRes.data ?? null,
      transactions: txRes.data ?? [],
      monthlyRank: rankRes.data?.rank ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
