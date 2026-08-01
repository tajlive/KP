import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me — server-verifisert innlogget bruker.
 *
 * AuthContext kan mangle bruker klient-side (sesjonen lever i HttpOnly-
 * cookies som browser-klienten ikke leser). Denne ruten er den ærlige
 * kilden til «hvem er innlogget» for UI som trenger e-post/id.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieResponse = NextResponse.next();
    const supabase = createServerClient(request, cookieResponse);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email ?? null,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[GET /api/auth/me] Unhandled error:", err);
    return NextResponse.json(
      { user: null, error: "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
