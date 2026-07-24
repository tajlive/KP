import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/user/email-preferences — les e-postpreferanser for innlogget bruker.
 * PUT  /api/user/email-preferences — upsert preferanser (whitelistet).
 *
 * KLA-auth: Browser-supabase er alltid anon (httpOnly auth-cookie), så
 * settings-UI kan ikke lese/skrive email_preferences direkte (RLS).
 * Kolonner verifisert mot information_schema 2026-07-24.
 */

const SELECT =
  "marketing_emails, transaction_emails, gamification_emails, trading_alerts, digest_emails";

const WRITABLE_FIELDS = [
  "marketing_emails",
  "transaction_emails",
  "gamification_emails",
  "trading_alerts",
  "digest_emails",
] as const;

const DIGEST_VALUES = new Set(["daily", "weekly", "never"]);

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
      .from("email_preferences")
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
    for (const field of WRITABLE_FIELDS) {
      if (!(field in body)) continue;
      const value = body[field];
      if (field === "digest_emails") {
        if (typeof value === "string" && DIGEST_VALUES.has(value)) {
          updates[field] = value;
        }
      } else if (typeof value === "boolean") {
        updates[field] = value;
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
    const { error } = await supabase.from("email_preferences").upsert(
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
