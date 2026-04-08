import { getAppUrl } from "@/lib/auth/config";
import { handleVippsCallback } from "@/lib/auth/vipps-callback";
import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

  // DEBUG: Log all auth-related cookies for troubleshooting
  const authCookies = allCookies.filter(c => 
    c.name.includes('sb-') || 
    c.name.includes('supabase') ||
    c.name.includes('verifier')
  );

  console.info("🔥 CALLBACK DEBUG:", {
    code: code ? `${code.slice(0, 20)}...` : "MISSING",
    error,
    statePrefix: state?.slice(0, 10) ?? "MISSING",
    totalCookies: allCookies.length,
    authCookieNames: authCookies.map(c => c.name),
    pkceCookieName: pkceCookie?.name || "NONE",
    pkceCookieValue: pkceCookie ? `${pkceCookie.value.substring(0, 20)}...` : "NONE",
    pkceCookieDomain: pkceCookie?.value ? 
      allCookies.find(c => c.name === pkceCookie.name)?.name : undefined,
    vippsCookie: vippsVerifier ? "SET" : "NONE",
    originUsed: origin,
    requestHost: host,
  });

  if (error) {
    console.error("🔥 OAUTH PROVIDER ERROR:", error);
    return NextResponse.redirect(
      new URL(`/${locale}/innlogging?error=${error}`, origin),
    );
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

  // CRITICAL FIX: PKCE cookie value is URL-encoded and may contain quotes
  // We need to decode it and ensure it's available for the exchange
  let codeVerifier: string | undefined;
  if (pkceCookie) {
    // Decode URL-encoded value and remove surrounding quotes if present
    let rawValue = decodeURIComponent(pkceCookie.value);
    if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      rawValue = rawValue.slice(1, -1);
    }
    codeVerifier = rawValue;
    
    console.info("🔥 PKCE COOKIE FOUND:", {
      name: pkceCookie.name,
      rawLength: pkceCookie.value.length,
      decodedLength: codeVerifier?.length,
      hasQuotes: pkceCookie.value.includes('%22') || pkceCookie.value.startsWith('"'),
    });
    
    // Re-set the cookie with decoded value for Supabase SSR to find
    response.cookies.set(pkceCookie.name, codeVerifier, {
      domain: ".klarpakke.no",
      path: "/",
      secure: true,
      sameSite: "none",
      httpOnly: false,
    });
    console.info("🔥 RE-SET PKCE COOKIE with decoded value");
  } else {
    console.error("🔥 NO PKCE COOKIE FOUND - auth will fail!");
    console.info("🔥 Available cookies:", allCookies.map(c => c.name));
  }

  try {
    const supabase = createServerClient(request, response);

    // MANUAL PKCE EXCHANGE: If we have codeVerifier, do manual exchange
    // This bypasses Supabase SSR cookie issues
    if (codeVerifier) {
      console.info("🔥 ATTEMPTING MANUAL PKCE EXCHANGE");
      
      const exchangeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=pkce`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            auth_code: code,
            code_verifier: codeVerifier,
          }),
        }
      );
      
      if (!exchangeResponse.ok) {
        const errorText = await exchangeResponse.text();
        console.error("🔥 MANUAL EXCHANGE FAILED:", exchangeResponse.status, errorText);
        
        // Fall back to regular exchange
        console.info("🔥 FALLING BACK TO REGULAR EXCHANGE");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError || !data.session) {
          console.error("🔥 EXCHANGE FAILED:", exchangeError?.message);
          return NextResponse.redirect(
            new URL(
              `/${locale}/innlogging?error=exchange_failed&detail=${encodeURIComponent(exchangeError?.message || "NO_SESSION")}`,
              origin,
            ),
          );
        }
        
        // Set session cookies manually
        const { session } = data;
        // Use correct Supabase SSR cookie format: sb-<project-ref>-auth-token
        response.cookies.set("sb-vuxbjlykgmzskxbclquf-auth-token", session.access_token, {
          domain: ".klarpakke.no",
          path: "/",
          secure: true,
          sameSite: "none",
          maxAge: session.expires_in,
        });
        response.cookies.set("sb-vuxbjlykgmzskxbclquf-refresh-token", session.refresh_token, {
          domain: ".klarpakke.no",
          path: "/",
          secure: true,
          sameSite: "none",
          maxAge: 60 * 60 * 24 * 365, // 1 year
        });
        
        console.info("✅ OAUTH SUCCESS (fallback) — redirecting to", `${origin}${next}`);
        return response;
      }
      
      const tokenData = await exchangeResponse.json();
      console.info("🔥 MANUAL EXCHANGE SUCCESS:", { hasAccessToken: !!tokenData.access_token });
      
      // Set session cookies manually
      // Use correct Supabase SSR cookie format: sb-<project-ref>-auth-token
      response.cookies.set("sb-vuxbjlykgmzskxbclquf-auth-token", tokenData.access_token, {
        domain: ".klarpakke.no",
        path: "/",
        secure: true,
        sameSite: "none",
        maxAge: tokenData.expires_in,
      });
      response.cookies.set("sb-vuxbjlykgmzskxbclquf-refresh-token", tokenData.refresh_token, {
        domain: ".klarpakke.no",
        path: "/",
        secure: true,
        sameSite: "none",
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
      
      console.info("✅ OAUTH SUCCESS (manual) — redirecting to", `${origin}${next}`);
      return response;
    }
    
    // Regular exchange without PKCE
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    await supabase.auth.getSession();

    console.info("🔥 EXCHANGE RESULT:", {
      success: !exchangeError,
      error: exchangeError?.message,
      errorName: exchangeError?.name,
      hasSession: !!data?.session,
      userId: data?.session?.user?.id?.slice(0, 8),
      redirectingTo: `${origin}${next}`,
      // Check if PKCE cookie is still present after exchange
      responseCookies: response.cookies.getAll().map(c => c.name),
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

    console.info(
      `✅ OAUTH SUCCESS — redirecting to ${protocol}://${host}${next}`,
    );
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
