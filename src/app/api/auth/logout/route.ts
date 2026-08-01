import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout — avslutter sesjonen server-side.
 *
 * Klient-side supabase.auth.signOut() er en stille no-op når sesjonen kun
 * lever i HttpOnly-cookies. Her går signOut gjennom SSR-klienten, som både
 * invaliderer tokenet hos Supabase OG skriver utløpte cookies på svaret.
 */
export async function POST(request: NextRequest) {
  try {
    // Viktig: JSON-svaret lages FØR signOut og sendes til createServerClient,
    // slik at de utløpte auth-cookiene festes på svaret vi faktisk returnerer.
    const response = NextResponse.json({ ok: true });
    const supabase = createServerClient(request, response);
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[POST /api/auth/logout] signOut error:", error.message);
      // Returner likevel 200 — cookiene er uansett skrevet ut på responsen,
      // og klienten skal sendes til forsiden. Ærlig feil logges server-side.
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
