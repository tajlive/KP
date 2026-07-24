import { requireAdmin } from "@/lib/admin/require-admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/admin/beta-signups — beta-paameldte (admin monetization-dashboard).
 *
 * KLA-auth: ClientMonetization leste beta_signups via browser-supabase
 * (alltid anon — stille tomt).
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.status === 401 ? "Ikke innlogget" : "Ingen tilgang" },
      { status: auth.status },
    );
  }

  const { data, error } = await auth.supabase
    .from("beta_signups")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, signups: data ?? [] });
}
