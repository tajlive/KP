import { requireAdmin } from "@/lib/admin/require-admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/admin/recent-signups — siste registrerte brukere (admin-aktivitetsfeed).
 *
 * KLA-auth: ClientAdminDashboard abonnerte paa user_profiles INSERT via
 * browser-supabase (alltid anon — feeden har aldri virket i prod). Denne
 * ruta erstatter det med 60s-polling: requireAdmin (getUser + allowlist).
 * Epost merges via security-definer RPC — user_profiles.email er kun
 * befolket for 3/43 rader, og GoTrue admin-API (listUsers) feiler i
 * Cloudflare Workers-runtime.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.status === 401 ? "Ikke innlogget" : "Ingen tilgang" },
      { status: auth.status },
    );
  }

  const { data, error } = await auth.supabase.rpc("admin_recent_signups", {
    max_rows: 10,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, signups: data ?? [] });
}
