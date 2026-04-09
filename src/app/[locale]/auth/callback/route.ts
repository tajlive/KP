import { getAppUrl } from "@/lib/auth/config";
import { handleVippsCallback } from "@/lib/auth/vipps-callback";
import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { handleOAuthError, getErrorRedirectUrl } from "./error-handler";

export const dynamic = "force-dynamic";

const VIPPS_PKCE_COOKIE = "vipps_pkce_verifier";
const VIPPS_STATE_PREFIX = "vipps_";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const url = new URL(request.url);

  const host = request.headers.get("host") || "localhost:3000";
  const canonicalUrl = getAppUrl();

  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
  const protocol = isLocalhost ? "http" : "https";

  const forwardedHost = request.headers.get("x-forwarded-host");
  const origin = isLocalhost
    ? `${protocol}://${host}`
    : forwardedHost
      ? `https://${forwardedHost}`
      : canonicalUrl;

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  const allCookies = request.cookies.getAll();
  const pkceCookie = allCookies.find((c) => c.name.includes("code-verifier"));
  const vippsVerifier = allCookies.find((c) => c.name === VIPPS_PKCE_COOKIE);

  // DEBUG: Log all auth-related cookies
  const authCookies = allCookies.filter(c => 
    c.name.includes('sb-') || 
    c.name.includes('supabase') ||
    c.name.includes('verifier')
  );

  console.error("🔥 CALLBACK DEBUG:", {
    code: code ? `${code.slice(0, 20)}...` : "MISSING",
    error,
    statePrefix: state?.slice(0, 10) ?? "MISSING",
    totalCookies: allCookies.length,
    authCookieNames: authCookies.map(c => c.name),
    pkceCookieName: pkceCookie?.name || "NONE",
    pkceCookieValue: pkceCookie ? `${pkceCookie.value.substring(0, 20)}...` : "NONE",
    vippsCookie: vippsVerifier ? "SET" : "NONE",
    originUsed: origin,
    requestHost: host,
  });

  // 🚨 HANDLE OAUTH ERRORS FROM PROVIDER (Google, etc.)
  if (error) {
    console.error("🔥 OAUTH PROVIDER ERROR:", error);
    
    // Use our error handler for user-friendly messages
    const errorResult = handleOAuthError(error, locale);
    console.error("🔥 ERROR DETAILS:", errorResult);
    
    // Redirect to login with error info
    const errorUrl = getErrorRedirectUrl(errorResult, locale, origin);
    return NextResponse.redirect(errorUrl, { status: 302 });
  }

  if (!code) {
    console.error("🔥 NO AUTH CODE RECEIVED");
    return NextResponse.redirect(
      new URL(`/${locale}/innlogging?error=no_code`, origin),
    );
  }

  // Vipps flow: state starts with vipps_, use code_verifier cookie and our handler
  if (state?.startsWith(VIPPS_STATE_PREFIX)) {
    const result = await handleVippsCallback({
      code,
      state,
      codeVerifier: vippsVerifier?.value ?? null,
      locale,
    });
    const res = NextResponse.redirect(result.redirectUrl, { status: 302 });
    res.cookies.delete(VIPPS_PKCE_COOKIE);
    return res;
  }

  function sanitizeRedirectPath(path: string | null): string {
    if (!path) return `/${locale}/dashboard`;
    if (path.startsWith("//")) return `/${locale}/dashboard`;
    const normalized = path.replace(/\/dashbord(\/|$)/g, "/dashboard$1");
    return normalized.startsWith("/") ? normalized : `/${locale}/dashboard`;
  }

  const nextParam =
    url.searchParams.get("next") || url.searchParams.get("redirectTo") || null;
  const next = sanitizeRedirectPath(nextParam);

  const successResponse = NextResponse.redirect(new URL(next, origin), {
    status: 302,
  });
  const response = successResponse;

  // CRITICAL FIX: Decode and re-set PKCE cookie for Supabase SSR
  // The cookie value is URL-encoded and may contain quotes
  // Use same cookie domain logic as createServerClient for consistency
  const cookieDomain = host.includes(":") ? undefined : `.${host.replace(/^www\./, "")}`;
  
  console.error("🔥 COOKIE CONFIG:", {
    cookieDomain,
    host,
    origin,
    next,
  });

  if (pkceCookie) {
    try {
      // Decode URL-encoded value
      let rawValue = decodeURIComponent(pkceCookie.value);
      
      // Remove surrounding quotes if present
      if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
        rawValue = rawValue.slice(1, -1);
      }
      
      console.error("🔥 RE-SETTING PKCE COOKIE:", {
        name: pkceCookie.name,
        decodedLength: rawValue.length,
        domain: cookieDomain,
      });
      
      // Re-set the cookie with decoded value
      response.cookies.set(pkceCookie.name, rawValue, {
        domain: cookieDomain,
        path: "/",
        secure: true,
        sameSite: "none",
        httpOnly: false,
      });
    } catch (e) {
      console.error("🔥 FAILED TO DECODE PKCE COOKIE:", e);
    }
  } else {
    console.error("🔥 NO PKCE COOKIE FOUND - auth will fail!");
  }

  // Prepare code verifier
  let codeVerifier: string | undefined;
  if (pkceCookie) {
    try {
      let rawValue = decodeURIComponent(pkceCookie.value);
      if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
        rawValue = rawValue.slice(1, -1);
      }
      codeVerifier = rawValue;
      console.error("🔥 CODE VERIFIER PREPARED:", {
        name: pkceCookie.name,
        length: codeVerifier.length,
      });
    } catch (e) {
      console.error("🔥 FAILED TO DECODE PKCE COOKIE:", e);
    }
  }

  try {
    // Use Supabase SSR client to handle exchange and cookie setting
    const supabase = createServerClient(request, response);

    console.error("🔥 CALLING exchangeCodeForSession");
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    // DEBUG: Log response cookies after exchange
    const responseCookies = response.cookies.getAll();
    console.error("🔥 EXCHANGE RESULT:", {
      success: !exchangeError,
      error: exchangeError?.message,
      errorName: exchangeError?.name,
      hasSession: !!data?.session,
      userId: data?.session?.user?.id?.slice(0, 8),
      responseCookieCount: responseCookies.length,
      responseCookieNames: responseCookies.map(c => c.name),
    });

    if (exchangeError || !data.session) {
      console.error(
        "🔥 EXCHANGE FAILED:",
        exchangeError?.message || "NO SESSION",
      );
      return NextResponse.redirect(
        new URL(
          `/${locale}/innlogging?error=exchange_failed&detail=${encodeURIComponent(exchangeError?.message || "NO_SESSION")}`,
          origin,
        ),
      );
    }

    // CRITICAL: Manually set auth cookies if Supabase didn't set them
    // This ensures the session persists across page loads
    const session = data.session;
    const existingAuthCookie = responseCookies.find(c => c.name.includes('auth-token'));
    
    if (!existingAuthCookie) {
      console.error("🔥 MANUALLY SETTING AUTH COOKIES");
      
      // Supabase SSR expects cookies in this format
      const projectId = 'vuxbjlykgmzskxbclquf';
      
      // Set the main auth token cookie (format: sb-<project-id>-auth-token)
      // This contains both access_token and refresh_token as JSON
      const authTokenValue = JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
        user: session.user,
      });
      
      response.cookies.set(`sb-${projectId}-auth-token`, authTokenValue, {
        domain: cookieDomain,
        path: '/',
        secure: true,
        sameSite: 'lax',  // lax is better for OAuth redirects
        httpOnly: false,  // must be false for client-side Supabase to read
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      
      // Also set code verifier cookie removal
      response.cookies.set(`sb-${projectId}-auth-token-code-verifier`, '', {
        domain: cookieDomain,
        path: '/',
        secure: true,
        sameSite: 'lax',
        httpOnly: false,
        maxAge: 0, // delete immediately
      });
      
      console.error("🔥 AUTH COOKIES SET MANUALLY:", {
        name: `sb-${projectId}-auth-token`,
        domain: cookieDomain,
        valueLength: authTokenValue.length,
      });
    }

    console.error(
      `✅ OAUTH SUCCESS — redirecting to ${next}`,
    );
    
    // DEBUG: Final cookie check before redirect
    const finalCookies = response.cookies.getAll();
    console.error("🔥 FINAL RESPONSE COOKIES:", {
      count: finalCookies.length,
      names: finalCookies.map(c => c.name),
      hasAuthToken: finalCookies.some(c => c.name.includes('auth-token') || c.name === 'sb-access-token'),
    });
    
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("🔥 CALLBACK EXCEPTION:", message);
    return NextResponse.redirect(
      new URL(
        `/${locale}/innlogging?error=auth_failed&detail=${encodeURIComponent(message)}`,
        origin,
      ),
    );
  }
}
