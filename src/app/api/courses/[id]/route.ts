import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/courses/[id] — publisert kurs-metadata for checkout.
 *
 * KLA-auth: ClientCheckout leste courses via browser-supabase (alltid anon —
 * virket bare hvis RLS tillot anon-select). Server-ruten gjør oppslaget
 * uavhengig av RLS og returnerer kun publiserte, ikke-sensitive felt.
 * Offentlig (checkout er en public commerce-side).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("courses")
      .select("id, title, description, price_nok")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Kurset ble ikke funnet" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, course: data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
