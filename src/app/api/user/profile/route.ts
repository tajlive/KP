import { NextRequest, NextResponse } from "next/server";

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
      .select("id, display_name, paper_balance, tier, preferred_trading_mode, onboarding_completed, created_at, is_priority")
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
