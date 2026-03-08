import { createServerClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // Extract locale from referer or default to 'no'
  const referer = request.headers.get("referer") || "";
  const localeMatch = referer.match(/\/(no|en|th|zh)\//);
  const locale = localeMatch ? localeMatch[1] : "no";

  // Create response object first (for cookie handling)
  const redirectUrl = new URL(`/${locale}/dashboard`, request.url);
  const response = NextResponse.redirect(redirectUrl, { status: 302 });

  if (!code) {
    console.error("[Auth Callback] No code received");
    return NextResponse.redirect(
      new URL(`/${locale}/innlogging?error=no_code`, request.url),
    );
  }

  // Use the route handler client that handles PKCE cookies properly
  const supabase = createServerClient(request, response);
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[Auth Callback] Exchange failed:", error.message);
    return NextResponse.redirect(
      new URL(`/${locale}/innlogging?error=exchange_failed`, request.url),
    );
  }

  // ── Referral-kobling ────────────────────────────────────────────────────
  // Les kp_ref-cookie satt av InnloggingClient
  const refCookie = request.cookies.get("kp_ref")?.value;
  const refCode = refCookie ? decodeURIComponent(refCookie) : null;

  if (refCode && sessionData?.user) {
    const userId = sessionData.user.id;

    // Finn og koble referral-raden (SECURITY DEFINER-funksjonen håndterer validering)
    const { error: refError } = await supabase
      .from("referral_tracking")
      .update({
        referred_user_id: userId,
        status: "account_created",
        signed_up_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("referral_code", refCode)
      .eq("status", "pending")
      .is("referred_user_id", null)
      .neq("referrer_user_id", userId); // kan ikke verve seg selv

    if (refError) {
      console.error("[Auth Callback] Referral update failed:", refError.message);
    }

    // Slett cookie etter bruk
    response.cookies.set("kp_ref", "", { maxAge: 0, path: "/" });
  }
  // ────────────────────────────────────────────────────────────────────────

  return response;
}
