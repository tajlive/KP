import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/notifications — brukerens varsler.
 *
 * KLA-auth: NotificationTray leste/skrev notifications via browser-supabase
 * (alltid anon — stille tomt/bruddsikrede kall). Server-ruta gjoer alt
 * user_id-scopet med ekte auth fra httpOnly-cookie.
 *
 * GET            → siste 20 varsler (nyeste foerst) + ulest-antall
 * PATCH {id}     → marker ett varsel lest
 * PATCH {all:true} → marker alle lest
 * DELETE ?id=    → slett ett varsel
 */

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
      .from("notifications")
      .select("id, type, title, body, data, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const notifications = data ?? [];
    return NextResponse.json({
      ok: true,
      notifications,
      unreadCount: notifications.filter((n) => !n.is_read).length,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" },
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

    if (body.all === true) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (typeof body.id === "string" && body.id.length > 0) {
      // user_id-filter: man kan kun røre egne varsler
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", body.id)
        .eq("user_id", user.id);
      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "Mangler id eller all" },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Ikke innlogget" },
        { status: 401 },
      );
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Mangler id" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
