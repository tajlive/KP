import { requireAdmin } from "@/lib/admin/require-admin";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/admin/students — brukerliste + rolle-endring (admin).
 *
 * KLA-auth: ClientStudentsPage leste/oppdaterte user_profiles via
 * browser-supabase (alltid anon — stille tomt/bruddsikrede kall).
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
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, users: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.status === 401 ? "Ikke innlogget" : "Ingen tilgang" },
      { status: auth.status },
    );
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.userId !== "string" ||
    typeof body.role !== "string" ||
    !body.role
  ) {
    return NextResponse.json(
      { ok: false, error: "userId og role kreves" },
      { status: 400 },
    );
  }

  // Whitelist av roller — ingen fritekst.
  // Dekker UI-rollene i /admin/users (user/beta/premium/master/phd/professor/admin)
  // + legacy student/instructor.
  const ALLOWED_ROLES = ["student", "admin", "instructor", "user", "beta", "premium", "master", "phd", "professor"];
  if (!ALLOWED_ROLES.includes(body.role)) {
    return NextResponse.json(
      { ok: false, error: `Ugyldig rolle (tillatt: ${ALLOWED_ROLES.join(", ")})` },
      { status: 400 },
    );
  }

  const { error } = await auth.supabase
    .from("user_profiles")
    .update({ role: body.role, updated_at: new Date().toISOString() })
    .eq("id", body.userId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
