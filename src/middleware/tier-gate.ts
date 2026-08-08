import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTierLevel, normalizeTier } from "@/lib/pricing/tier-level";
import {
  createSupabaseClient,
  getCookieDomain,
  redirectWithCookies,
} from "./auth-guard";
import { parseLocalePath } from "./locale-path";

/** Én trading-side: live gated via /handel?mode=live */
const TIER_GATED_ROUTES: Array<
  | { path: string; minLevel: number }
  | { path: string; minLevel: number; requireQuery: Record<string, string> }
> = [
  { path: "/trade", minLevel: 1, requireQuery: { mode: "live" } },
  { path: "/dashboard/bots", minLevel: 2 },
];

function routeMatches(
  route: (typeof TIER_GATED_ROUTES)[number],
  strippedPath: string,
  searchParams: URLSearchParams,
): boolean {
  const pathMatch =
    strippedPath === route.path || strippedPath.startsWith(`${route.path}/`);
  if (!pathMatch) return false;
  if ("requireQuery" in route && route.requireQuery) {
    for (const [key, value] of Object.entries(route.requireQuery)) {
      if (searchParams.get(key) !== value) return false;
    }
  }
  return true;
}

/**
 * Check whether a pathname (+ optional query) is accessible for the given tier.
 * Returns true if the route is not gated or the tier meets the minimum.
 */
export function checkTierAccess(
  pathname: string,
  tier: string,
  searchParams?: URLSearchParams,
): boolean {
  const { strippedPath } = parseLocalePath(pathname);
  const params = searchParams ?? new URLSearchParams();
  const route = TIER_GATED_ROUTES.find((r) =>
    routeMatches(r, strippedPath, params),
  );
  if (!route) return true;
  return getTierLevel(tier) >= route.minLevel;
}

const TIER_COOKIE = "kp_tier";
const TIER_COOKIE_MAX_AGE = 3600;

export async function handleTierGate(
  request: NextRequest,
  response: NextResponse,
  userId: string,
): Promise<NextResponse | null> {
  const { pathname, searchParams } = request.nextUrl;
  const { locale, strippedPath } = parseLocalePath(pathname);

  const gatedRoute = TIER_GATED_ROUTES.find((r) =>
    routeMatches(r, strippedPath, searchParams),
  ) as (typeof TIER_GATED_ROUTES)[number] | undefined;
  if (!gatedRoute) return null;

  let tier = request.cookies.get(TIER_COOKIE)?.value;

  if (!tier) {
    const supabase = createSupabaseClient(request, response);
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("tier, role")
      .eq("id", userId)
      .maybeSingle();

    // Founder-loven (2026-08-08): founder-rolle = professor-nivå i rutegates
    if ((profile as { role?: string } | null)?.role === "founder") {
      tier = "professor";
    } else {
      tier = normalizeTier((profile as { tier?: string } | null)?.tier);
    }
    const host = request.headers.get("host") || "";
    const isLocalhost =
      host.startsWith("localhost") || host.startsWith("127.0.0.1");
    response.cookies.set(TIER_COOKIE, tier, {
      path: "/",
      maxAge: TIER_COOKIE_MAX_AGE,
      sameSite: "lax",
      secure: !isLocalhost,
      httpOnly: true,
      ...(isLocalhost ? {} : { domain: getCookieDomain(request) }),
    });
  }

  if (getTierLevel(tier) < gatedRoute.minLevel) {
    const upgradeUrl = new URL(`/${locale}/priser`, request.url);
    upgradeUrl.searchParams.set("upgrade", "true");
    return redirectWithCookies(upgradeUrl, request, response);
  }

  return null;
}
