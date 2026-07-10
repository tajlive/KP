import { NextRequest, NextResponse } from "next/server";
import {
  isGuestAuthRoute,
  localizedPathname,
  parseLocalePath,
  sanitizePostAuthRedirect,
} from "./locale-path";
import { redirectWithCookies, getCookieDomain } from "./auth-guard";
import { createServerClient, createClient } from "@/lib/supabase/server";
import { handleOnboarding } from "./onboarding";
import { handleTierGate } from "./tier-gate";
import { decryptImpersonationToken } from "@/lib/admin/impersonation-crypto";

/** Redirect med cache-bypass — forhindrer at auth-redirects caches av CDN */
function redirectNoCache(url: string | URL, status?: number): NextResponse {
  const res = NextResponse.redirect(url, status);
  res.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  res.headers.set("CDN-Cache-Control", "no-store, max-age=0");
  return res;
}

const PROTECTED_PATHS = [
  "/dashboard",
  "/innstillinger",
  "/settings",
  "/admin",
  "/checkout",
  "/akademi",
  "/handel",
  "/konto",
  "/leagues",
  "/copy-trading",
  "/marketplace",
  "/profile",
];

const AUTH_PATHS = [
  "/login",
  "/register",
  "/registrer",
  "/glemt-passord",
];

const IMPERSONATION_COOKIE = "__impersonate";
const BANNER_COOKIE = "__impersonation_banner";

interface DecryptedImpersonation {
  accessToken: string;
  refreshToken: string;
  jti: string;
  targetUserId: string;
  expiresAt: string;
}

interface ImpersonationBanner {
  targetUserId: string;
  targetEmail?: string;
  targetDisplayName?: string;
  expiresAt: string;
}

interface ImpersonationCookies {
  authCookies: Array<{ name: string; value: string }>;
  banner: ImpersonationBanner;
}

function getSupabaseProjectRef(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const hostname = new URL(url).hostname;
    const [sub] = hostname.split(".");
    return sub;
  } catch {
    return undefined;
  }
}

function authCookieName(url?: string): string {
  const ref = getSupabaseProjectRef(url);
  return ref ? `sb-${ref}-auth-token` : "sb-auth-token";
}

function refreshCookieName(url?: string): string {
  const ref = getSupabaseProjectRef(url);
  return ref ? `sb-${ref}-refresh-token` : "sb-refresh-token";
}

function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as {
      exp?: unknown;
    };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

async function validateImpersonationSession(
  decrypted: DecryptedImpersonation,
): Promise<ImpersonationBanner | null> {
  try {
    const supabase = createClient();
    const { data: session, error } = await supabase
      .from("support_impersonation_sessions")
      .select("id, expires_at, ended_at, revoked_at")
      .eq("token_jti", decrypted.jti)
      .eq("target_user_id", decrypted.targetUserId)
      .maybeSingle();

    if (error || !session) return null;
    if (session.ended_at || session.revoked_at) return null;
    if (new Date(session.expires_at) <= new Date()) return null;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email, display_name")
      .eq("id", decrypted.targetUserId)
      .maybeSingle();

    return {
      targetUserId: decrypted.targetUserId,
      targetEmail: profile?.email ?? undefined,
      targetDisplayName: profile?.display_name ?? undefined,
      expiresAt: decrypted.expiresAt,
    };
  } catch (err) {
    console.warn("[middleware] Impersonation session validation failed:", err);
    return null;
  }
}

function buildImpersonationCookies(
  decrypted: DecryptedImpersonation,
  banner: ImpersonationBanner,
): ImpersonationCookies {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const authName = authCookieName(url);
  const refreshName = refreshCookieName(url);
  const exp = decodeJwtExp(decrypted.accessToken);
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAtSec = exp ?? nowSec + 3600;
  const expiresIn = Math.max(0, expiresAtSec - nowSec);

  const sessionPayload = JSON.stringify({
    access_token: decrypted.accessToken,
    refresh_token: decrypted.refreshToken,
    expires_at: expiresAtSec,
    expires_in: expiresIn,
    token_type: "bearer",
  });

  return {
    authCookies: [
      { name: authName, value: sessionPayload },
      { name: refreshName, value: decrypted.refreshToken },
    ],
    banner,
  };
}

function clearImpersonationAndRedirect(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const cookieDomain = getCookieDomain(request);
  response.cookies.set(IMPERSONATION_COOKIE, "", {
    maxAge: 0,
    path: "/",
    domain: cookieDomain,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });
  response.cookies.set(BANNER_COOKIE, "", {
    maxAge: 0,
    path: "/",
    domain: cookieDomain,
    httpOnly: false,
    secure: true,
    sameSite: "lax",
  });

  const pathname = request.nextUrl.pathname;
  const { locale } = parseLocalePath(pathname);
  const dest = new URL(
    localizedPathname(locale, "/admin/support/impersonate"),
    request.url,
  );
  return redirectNoCache(dest, 302);
}

export async function authMiddleware(
  request: NextRequest,
  response?: NextResponse,
): Promise<NextResponse> {
  response = response ?? NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const { strippedPath } = parseLocalePath(pathname);

  // If i18n already redirected, we still operate on the original request
  // but the response object may carry cookies from i18n.
  // If response is not a 200, auth stops the chain via isTerminal.
  // We intentionally continue auth processing for 200 responses.

  // Skip auth callback — route handler does its own PKCE exchange
  // But log for debugging OAuth issues
  if (strippedPath === "/callback") {
    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");
    const locale = parseLocalePath(pathname).locale;

    // Log to Sentry in production if there's an error
    if (error && process.env.NODE_ENV === "production") {
      console.error(`[Auth Callback] OAuth error: ${error}`, {
        locale,
        path: strippedPath,
        referer: request.headers.get("referer"),
      });
    }

    return response;
  }

  // Skip API routes — they handle auth via 401/403 responses, not login redirects
  if (strippedPath.startsWith("/api")) {
    return response;
  }

  // Auth decisions are only needed for protected, auth, onboarding and callback routes.
  // Marketing/public pages skip the Supabase getUser() call to reduce TTFB.
  const isProtected = PROTECTED_PATHS.some((p) => strippedPath.startsWith(p));
  const isAuthPage = AUTH_PATHS.some(
    (p) => strippedPath === p || strippedPath.startsWith(`${p}/`),
  );
  const isOnboardingPage = strippedPath.startsWith("/onboarding");
  const isGuestAuth = isGuestAuthRoute(strippedPath);
  const locale = parseLocalePath(pathname).locale;

  const needsUser = isProtected || isAuthPage || isGuestAuth || isOnboardingPage;
  if (!needsUser) {
    return response;
  }

  // ─── Impersonation cookie handling ───────────────────────────────────────
  // If an admin has started a support impersonation session, swap the request's
  // auth cookies for the target user's real Supabase session tokens. The
  // __impersonate cookie is HttpOnly, so the UI relies on a non-HttpOnly banner
  // cookie to render the impersonation indicator.
  let impersonation: ImpersonationCookies | null = null;
  const impersonateCookie = request.cookies.get(IMPERSONATION_COOKIE);

  if (impersonateCookie?.value) {
    const secret = process.env.IMPERSONATION_SECRET;
    if (!secret) {
      console.warn(
        "[middleware] IMPERSONATION_SECRET missing — rejecting impersonation",
      );
      return clearImpersonationAndRedirect(request, response);
    }

    const decrypted = await decryptImpersonationToken(
      impersonateCookie.value,
      secret,
    );
    if (!decrypted) {
      console.warn("[middleware] Failed to decrypt impersonation cookie");
      return clearImpersonationAndRedirect(request, response);
    }

    const banner = await validateImpersonationSession(decrypted);
    if (!banner) {
      console.warn("[middleware] Invalid or expired impersonation session");
      return clearImpersonationAndRedirect(request, response);
    }

    impersonation = buildImpersonationCookies(decrypted, banner);
    const cookieDomain = getCookieDomain(request);
    const bannerMaxAge = Math.max(
      0,
      Math.floor(new Date(banner.expiresAt).getTime() / 1000) -
        Math.floor(Date.now() / 1000),
    );

    for (const cookie of impersonation.authCookies) {
      response.cookies.set(cookie.name, cookie.value, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        domain: cookieDomain,
        path: "/",
      });
    }

    response.cookies.set(BANNER_COOKIE, JSON.stringify(impersonation.banner), {
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      domain: cookieDomain,
      path: "/",
      maxAge: bannerMaxAge,
    });
  }

  // 1. Supabase session refresh (writes updated cookies to the passed response)
  // CRITICAL FIX: Use single Supabase client per request to avoid cookie/sync issues
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[middleware] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing — skipping session refresh. Check .env.local and Cloudflare Workers env/secrets.",
    );
    return response;
  }

  const supabase = createServerClient(
    request,
    response,
    impersonation?.authCookies,
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Logged-in users should not see guest auth pages
  if (user && isGuestAuth) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const target = sanitizePostAuthRedirect(nextParam, locale);
    const dest = new URL(target, request.url);
    return redirectWithCookies(dest, request, response);
  }

  // Authenticated users on auth pages -> dashboard
  if (user && isAuthPage) {
    return redirectWithCookies(
      new URL(localizedPathname(locale, "/dashboard"), request.url),
      request,
      response,
      302,
    );
  }

  // Unauthenticated users on protected paths -> login (preserve intended URL)
  if (isProtected && !user) {
    const loginUrl = new URL(localizedPathname(locale, "/login"), request.url);
    loginUrl.searchParams.set("next", pathname);
    return redirectWithCookies(loginUrl, request, response);
  }

  // Onboarding & tier gates for logged-in users on protected paths or onboarding
  if (user && (isProtected || isOnboardingPage)) {
    const onboardingResult = await handleOnboarding(request, response);
    if (onboardingResult) return onboardingResult;
  }

  if (user) {
    const tierResult = await handleTierGate(request, response, user.id);
    if (tierResult) return tierResult;
  }

  return response;
}
