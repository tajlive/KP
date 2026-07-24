import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Create Supabase client with timeout
    const supabasePromise = import("@/lib/supabase/server").then(m => m.createServerClient());
    const supabase = await Promise.race([
      supabasePromise,
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000)
      ),
    ]) as Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerClient>>;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Ikke innlogget" },
        { status: 401 }
      );
    }

    const userId = request.nextUrl.searchParams.get("userId") || user.id;

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, display_name, full_name, avatar_url, risk_tolerance, paper_balance, tier, preferred_trading_mode, onboarding_completed, created_at, is_priority")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { ok: false, error: profileError.message },
        { status: 500 }
      );
    }

    // Fetch wallets
    const { data: wallets, error: walletsError } = await supabase
      .from("wallets")
      .select("id, currency, balance")
      .eq("user_id", userId);

    return NextResponse.json({
      ok: true,
      profile,
      wallets: wallets || [],
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

// Felter brukeren kan endre selv — whitelist mot masse-tilordning
const PATCHABLE_FIELDS = [
  "display_name",
  "full_name",
  "avatar_url",
  "risk_tolerance",
] as const;

/**
 * PATCH: upsert av egen profil (opprett ved manglende rad, ellers oppdater).
 * Browser-supabase er anon (httpOnly auth-cookie) — profil-skriving MÅ
 * gå via denne ruta med server-side auth.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Ikke innlogget" },
        { status: 401 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Ugyldig JSON" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    for (const field of PATCHABLE_FIELDS) {
      if (field in body) {
        const value = body[field];
        if (value !== null && typeof value !== "string") {
          return NextResponse.json(
            { ok: false, error: `Ugyldig verdi for ${field}` },
            { status: 400 }
          );
        }
        updates[field] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { ok: false, error: "Ingen gyldige felter" },
        { status: 400 }
      );
    }

    const { data: profile, error: upsertError } = await supabase
      .from("user_profiles")
      .upsert({
        id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      } as Database["public"]["Tables"]["user_profiles"]["Insert"])
      .select("id, display_name, full_name, avatar_url, risk_tolerance, paper_balance, tier, preferred_trading_mode, onboarding_completed, created_at, is_priority")
      .single();

    if (upsertError) {
      return NextResponse.json(
        { ok: false, error: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

/** DELETE: slett egen profil-rad (farlig handling — kun egen bruker). */
export async function DELETE() {
  try {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Ikke innlogget" },
        { status: 401 }
      );
    }

    const { error: deleteError } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { ok: false, error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
