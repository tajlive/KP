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

  // Hent ALLE brukere: auth.users (kilde) LEFT JOIN user_profiles (detaljer).
  // 11 brukere manglet fordi de aldri fikk user_profiles-rad (signup-trigger feilet).
  const { data: authUsers, error: authError } = await auth.supabase
    .from("auth.users")
    .select("id, email, created_at, last_sign_in_at")
    .order("created_at", { ascending: false });

  if (authError) {
    return NextResponse.json({ ok: false, error: authError.message }, { status: 500 });
  }

  const { data: profiles, error: profileError } = await auth.supabase
    .from("user_profiles")
    .select("*");

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
  }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Slå sammen: auth.users er master, user_profiles beriker.
  const users = (authUsers ?? []).map((u) => {
    const p = profileMap.get(u.id);
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      display_name: p?.display_name ?? "",
      full_name: p?.full_name ?? "",
      role: p?.role ?? "user",
      tier: p?.tier ?? "free",
      paper_balance: p?.paper_balance ?? 100000,
      avatar_url: p?.avatar_url ?? null,
      onboarding_completed_at: p?.onboarding_completed_at ?? null,
      has_profile: Boolean(p),
    };
  });

  return NextResponse.json({ ok: true, users });
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
