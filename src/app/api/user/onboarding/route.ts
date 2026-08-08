import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/user/onboarding — les onboarding-state for innlogget bruker.
 * PATCH /api/user/onboarding — oppdater onboarding-state (whitelistet).
 *
 * KLA-auth: Browser-supabase er alltid anon (httpOnly auth-cookie), så
 * onboarding-sidene kan ikke lese/skrive user_profiles direkte.
 * Kraken-tilkobling håndteres via user_kraken_keys + /api/kraken/connect.
 */

const ONBOARDING_SELECT =
  "onboarding_step, onboarding_completed, onboarding_started_at, onboarding_completed_at, trading_experience, paper_balance";

const PATCHABLE_FIELDS = [
  "trading_experience",
  "paper_balance",
  "onboarding_step",
  "onboarding_started_at",
  "onboarding_completed",
  "onboarding_completed_at",
  "setup_completed_at",
] as const;

type PatchableField = (typeof PATCHABLE_FIELDS)[number];

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
      .from("user_profiles")
      .select(ONBOARDING_SELECT)
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, onboarding: data });
  } catch (error) {
    console.error("[onboarding] GET error:", error);
    return NextResponse.json(
      { ok: false, error: "Intern serverfeil" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Ikke innlogget" },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Ugyldig body" },
        { status: 400 },
      );
    }

    // Whitelist — ingen masse-tilordning
    const updates: Partial<Record<PatchableField, unknown>> = {};
    for (const field of PATCHABLE_FIELDS) {
      if (field in body) {
        updates[field] = (body as Record<string, unknown>)[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { ok: false, error: "Ingen gyldige felt" },
        { status: 400 },
      );
    }

    // onboarding_step må være et heltall >= 0
    if (
      "onboarding_step" in updates &&
      (typeof updates.onboarding_step !== "number" ||
        !Number.isInteger(updates.onboarding_step) ||
        updates.onboarding_step < 0)
    ) {
      return NextResponse.json(
        { ok: false, error: "onboarding_step må være et heltall >= 0" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", user.id)
      .select(ONBOARDING_SELECT)
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, onboarding: data });
  } catch (error) {
    console.error("[onboarding] PATCH error:", error);
    return NextResponse.json(
      { ok: false, error: "Intern serverfeil" },
      { status: 500 },
    );
  }
}
