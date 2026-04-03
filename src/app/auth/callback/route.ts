import { createServerClient } from "@/lib/supabase/server";
import { localizedPathname } from "@/middleware/locale-path";
import { NextResponse, type NextRequest } from "next/server";
import { logAuthError, AuthErrorCode, logAuthEvent, AuthEvent, setAuthUser } from "@/lib/auth/sentry-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next");

  // Extract locale from referer or default to 'no'
  const referer = request.headers.get("referer") || "";
  const localeMatch = referer.match(/\/(no|en|th|zh)\//);
  const locale = localeMatch ? localeMatch[1] : "no";

  // Create response object first (for cookie handling)
  const redirectPath = next || localizedPathname(locale, "/dashboard");
  const redirectUrl = new URL(redirectPath, request.url);
  const response = NextResponse.redirect(redirectUrl, { status: 302 });

  // Handle OAuth provider errors
  if (error) {
    console.error("[Auth Callback] OAuth error:", { error, errorDescription });
    logAuthError(
      AuthErrorCode.CALLBACK_ERROR,
      new Error(`OAuth error: ${error} - ${errorDescription || "No description"}`),
      { locale, error, errorDescription }
    );
    
    const errorUrl = new URL(
      `${localizedPathname(locale, "/login")}?error=provider_error&detail=${encodeURIComponent(error)}`,
      request.url,
    );
    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    console.error("[Auth Callback] No code received");
    logAuthError(
      AuthErrorCode.PKCE_CODE_MISSING,
      new Error("No authorization code received from OAuth provider"),
      { locale, referer }
    );
    
    return NextResponse.redirect(
      new URL(
        `${localizedPathname(locale, "/login")}?error=no_code`,
        request.url,
      ),
    );
  }

  // Use the route handler client that handles PKCE cookies properly
  const supabase = createServerClient(request, response);
  
  try {
    const { data: sessionData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("[Auth Callback] Exchange failed:", exchangeError.message);
      logAuthError(
        AuthErrorCode.PKCE_EXCHANGE_FAILED,
        exchangeError,
        { 
          locale, 
          codePrefix: code?.substring(0, 10),
          errorName: exchangeError.name,
          errorStatus: exchangeError.status,
        }
      );
      
      return NextResponse.redirect(
        new URL(
          `${localizedPathname(locale, "/login")}?error=exchange_failed`,
          request.url,
        ),
      );
    }

    if (!sessionData?.session) {
      console.error("[Auth Callback] No session after exchange");
      logAuthError(
        AuthErrorCode.SESSION_INVALID,
        new Error("No session returned after PKCE exchange"),
        { locale, userId: sessionData?.user?.id }
      );
      
      return NextResponse.redirect(
        new URL(
          `${localizedPathname(locale, "/login")}?error=session_invalid`,
          request.url,
        ),
      );
    }

    // Success! Log the event and set Sentry user
    logAuthEvent(AuthEvent.LOGIN_SUCCESS, {
      userId: sessionData.user?.id,
      provider: sessionData.user?.app_metadata?.provider || "unknown",
      locale,
    });
    
    if (sessionData.user?.id) {
      setAuthUser(sessionData.user.id, sessionData.user.email);
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
        console.error(
          "[Auth Callback] Referral update failed:",
          refError.message,
        );
        // Don't fail the login if referral fails
      }

      // Slett cookie etter bruk
      response.cookies.set("kp_ref", "", { maxAge: 0, path: "/" });
    }
    // ────────────────────────────────────────────────────────────────────────

    return response;
    
  } catch (unexpectedError) {
    console.error("[Auth Callback] Unexpected error:", unexpectedError);
    logAuthError(
      AuthErrorCode.UNKNOWN,
      unexpectedError,
      { locale, codePrefix: code?.substring(0, 10) }
    );
    
    return NextResponse.redirect(
      new URL(
        `${localizedPathname(locale, "/login")}?error=callback_error`,
        request.url,
      ),
    );
  }
}
