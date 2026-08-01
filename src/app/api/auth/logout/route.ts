import { createServerClient, createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout — avslutter sesjonen VARIG, server-side.
 *
 * Klient-side supabase.auth.signOut() er en stille no-op når sesjonen kun
 * lever i HttpOnly-cookies. Og selv en SSR-signOut som bare sletter cookies
 * er ikke nok: en annen åpen fane (eller klient med in-memory refresh-token)
 * kan ellers refreshe seg tilbake til liv. Derfor to steg:
 *
 * 1. Service-role admin.signOut(access_token, "global") — revokerer ALLE
 *    brukerens refresh-tokens hos Supabase. Dette er det som gjør
 *    utloggingen varig på tvers av faner og enheter.
 * 2. SSR-signOut — skriver utløpte cookies på svaret (rydder denne klienten).
 */
export async function POST(request: NextRequest) {
  try {
    // Viktig: JSON-svaret lages FØR signOut og sendes til createServerClient,
    // slik at de utløpte auth-cookiene festes på svaret vi faktisk returnerer.
    const response = NextResponse.json({ ok: true });
    const supabase = createServerClient(request, response);

    // Hent access-token FØR cookiene slettes — trengs for global revokering.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      const admin = createClient();
      const { error: adminError } = await admin.auth.admin.signOut(
        session.access_token,
        "global",
      );
      if (adminError) {
        // Logges ærlig — selv om revokering feiler, rydder vi denne klienten.
        console.error(
          "[POST /api/auth/logout] admin signOut (global) error:",
          adminError.message,
        );
      }
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[POST /api/auth/logout] signOut error:", error.message);
    }

    return response;
  } catch (err) {
    console.error("[POST /api/auth/logout] Unhandled error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
