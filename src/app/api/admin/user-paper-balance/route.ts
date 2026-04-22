import { logAdminAudit } from "@/lib/admin/log-admin-audit";
import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { createClient as createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  user_id: z.string().uuid(),
  balance_nok: z
    .number()
    .finite()
    .min(0, "balance_nok must be >= 0")
    .max(50_000_000, "balance_nok too large"),
  /** Oppdater aktive paper trading_sessions (current capital). */
  sync_trading_sessions: z.boolean().optional().default(true),
  /** Sett også startkapital + nullstill P&L på matchede økter (full reset av baseline). */
  reset_session_baseline: z.boolean().optional().default(false),
});

/**
 * Admin: sett brukers lekepenger (profil + aktive paper trading_sessions).
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    user_id,
    balance_nok,
    sync_trading_sessions,
    reset_session_baseline,
  } = parsed.data;

  try {
    const db = createServiceClient();

    const { data: profile, error: profileErr } = await db
      .from("user_profiles")
      .select("id, paper_balance")
      .eq("id", user_id)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    const previousPaperBalance = profile.paper_balance;

    const now = new Date().toISOString();
    const { error: updateProfileErr } = await db
      .from("user_profiles")
      .update({
        paper_balance: balance_nok,
        updated_at: now,
      })
      .eq("id", user_id);

    if (updateProfileErr) {
      console.error("[admin user-paper-balance] profile", updateProfileErr);
      return NextResponse.json(
        { error: updateProfileErr.message },
        { status: 500 },
      );
    }

    let sessionsUpdated = 0;

    if (sync_trading_sessions) {
      const patch = {
        current_capital_nok: balance_nok,
        current_capital: balance_nok,
        updated_at: now,
        ...(reset_session_baseline ? {
          starting_capital_nok: balance_nok,
          initial_capital: balance_nok,
          total_pnl: 0,
        } : {}),
      } as { current_capital_nok: number; current_capital: number; updated_at: string; starting_capital_nok?: number; initial_capital?: number; total_pnl?: number };

      const { data: updated, error: sessErr } = await db
        .from("trading_sessions")
        .update(patch).eq("user_id", user_id)
        .eq("mode", "paper")
        .eq("status", "active")
        .select("id");

      if (sessErr) {
        console.error("[admin user-paper-balance] sessions", sessErr);
        return NextResponse.json({ error: sessErr.message }, { status: 500 });
      }
      sessionsUpdated = updated?.length ?? 0;
    }

    await logAdminAudit(db, {
      admin_user_id: auth.userId,
      action: "user_paper_balance",
      target_user_id: user_id,
      payload: {
        previous_paper_balance: previousPaperBalance,
        new_balance_nok: balance_nok,
        sync_trading_sessions,
        reset_session_baseline,
        active_paper_sessions_updated: sessionsUpdated,
      },
    });

    return NextResponse.json({
      ok: true,
      user_id,
      paper_balance: balance_nok,
      active_paper_sessions_updated: sessionsUpdated,
      reset_session_baseline,
    });
  } catch (e) {
    console.error("[admin user-paper-balance]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
