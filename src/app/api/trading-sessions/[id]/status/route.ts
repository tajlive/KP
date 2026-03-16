import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_STATUSES = ["active", "paused", "stopped"] as const;
type SessionStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieEncoding: "raw",
        cookies: {
          getAll: () => cookieStore.getAll(),
        },
      }
    );

    // Sjekk autentisering
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Ikke autentisert" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body as { status: SessionStatus };

    // Valider status
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Ugyldig status. Må være: active, paused, eller stopped" },
        { status: 400 }
      );
    }

    // Verifiser eierskap til trading session
    const { data: session, error: sessionError } = await supabase
      .from("trading_sessions")
      .select("user_id")
      .eq("id", id)
      .single();

    if (sessionError) {
      if (sessionError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Trading session ikke funnet" },
          { status: 404 }
        );
      }
      throw sessionError;
    }

    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: "Ingen tilgang til denne trading session" },
        { status: 403 }
      );
    }

    // Oppdater status
    const { data: updatedSession, error: updateError } = await supabase
      .from("trading_sessions")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Logg handlingen for audit
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "trading_session_status_changed",
      details: {
        session_id: id,
        new_status: status,
        previous_status: session,
      },
    });

    return NextResponse.json({
      success: true,
      session: updatedSession,
    });
  } catch (err) {
    console.error("Error updating trading session status:", err);
    return NextResponse.json(
      { error: "Serverfeil ved oppdatering av status" },
      { status: 500 }
    );
  }
}
