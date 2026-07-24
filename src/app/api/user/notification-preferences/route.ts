import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/user/notification-preferences — les varslingspreferanser.
 * PUT  /api/user/notification-preferences — upsert preferanser (whitelistet).
 *
 * KLA-auth: Browser-supabase er alltid anon (httpOnly auth-cookie), så
 * settings-UI kan ikke lese/skrive notification_preferences direkte (RLS).
 * Kolonner verifisert mot information_schema 2026-07-24.
 */

const SELECT =
  "email_notifications, push_notifications, telegram_notifications, marketing_emails, product_updates, trading_alerts, beta_updates, push_price_alerts, push_trading_signals, push_stop_loss, push_portfolio_updates, push_market_news, push_competition, push_transactions, quiet_hours_enabled, quiet_hours_start, quiet_hours_end";

const BOOLEAN_FIELDS = [
  "email_notifications",
  "push_notifications",
  "telegram_notifications",
  "marketing_emails",
  "product_updates",
  "trading_alerts",
  "beta_updates",
  "push_price_alerts",
  "push_trading_signals",
  "push_stop_loss",
  "push_portfolio_updates",
  "push_market_news",
  "push_competition",
  "push_transactions",
  "quiet_hours_enabled",
] as const;

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
      .from("notification_preferences")
      .select(SELECT)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, preferences: data ?? null });
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

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Ugyldig JSON-body" },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    for (const field of BOOLEAN_FIELDS) {
      if (field in body && typeof body[field] === "boolean") {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { ok: false, error: "Ingen gyldige felt i body" },
        { status: 400 },
      );
    }

    // RLS-felle: ON CONFLICT evaluerer INSERT-policy FØR konfliktløsning —
    // user_id MÅ med i upsert
    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

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
