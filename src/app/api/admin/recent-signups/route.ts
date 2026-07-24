import { isEmailOnServerAdminAllowlist } from "@/lib/admin/admin-allowlist.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/admin/recent-signups — siste registrerte brukere (admin-aktivitetsfeed).
 *
 * KLA-auth: ClientAdminDashboard abonnerte paa user_profiles INSERT via
 * browser-supabase (alltid anon — feeden har aldri virket i prod). Denne
 * ruta erstatter det med 60s-polling: getUser + admin-allowlist,
 * service-role-spoerring server-side.
 */
export async function GET() {
  try {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Ikke innlogget" },
        { status: 401 },
      );
    }

    if (!isEmailOnServerAdminAllowlist(user.email)) {
      return NextResponse.json(
        { ok: false, error: "Ingen tilgang" },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, email, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, signups: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
