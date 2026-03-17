import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createSupabaseClient, getCookieDomain, redirectWithCookies } from './auth-guard'

const TIER_LEVELS: Record<string, number> = {
  gratis: 0,
  free: 0,
  student: 0,
  basis: 1,
  bachelor: 1,
  komplett: 2,
  master: 2,
  pro: 3,
  phd: 3,
  professor: 4,
  beta: 3,
}

const TIER_GATED_ROUTES = [
  { path: '/live-trading', minLevel: 1 },
  { path: '/dashboard/auto-trade', minLevel: 2 },
  { path: '/dashboard/bots', minLevel: 2 },
] as const

/**
 * Check whether a pathname is accessible for the given tier.
 * Returns true if the route is not gated or the tier meets the minimum.
 */
export function checkTierAccess(pathname: string, tier: string): boolean {
  const route = TIER_GATED_ROUTES.find(
    r => pathname === r.path || pathname.startsWith(`${r.path}/`)
  )
  if (!route) return true
  return (TIER_LEVELS[tier] ?? 0) >= route.minLevel
}

const TIER_COOKIE = 'kp_tier'
const TIER_COOKIE_MAX_AGE = 3600

export async function handleTierGate(
  request: NextRequest,
  response: NextResponse,
  userId: string,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl
  const locale = pathname.split('/')[1] || 'no'
  const strippedPath = pathname.replace(/^\/(no|en|th|zh)/, '') || '/'

  const gatedRoute = TIER_GATED_ROUTES.find(
    r => strippedPath === r.path || strippedPath.startsWith(`${r.path}/`)
  )
  if (!gatedRoute) return null

  let tier = request.cookies.get(TIER_COOKIE)?.value

  if (!tier) {
    const supabase = createSupabaseClient(request, response)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .maybeSingle()

    tier = (profile as { subscription_tier?: string } | null)?.subscription_tier || 'gratis'

    const host = request.headers.get('host') || ''
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1')
    response.cookies.set(TIER_COOKIE, tier, {
      path: '/',
      maxAge: TIER_COOKIE_MAX_AGE,
      sameSite: 'lax',
      secure: !isLocalhost,
      httpOnly: true,
      ...(isLocalhost ? {} : { domain: getCookieDomain(request) }),
    })
  }

  if ((TIER_LEVELS[tier] ?? 0) < gatedRoute.minLevel) {
    const upgradeUrl = new URL(`/${locale}/priser`, request.url)
    upgradeUrl.searchParams.set('upgrade', 'true')
    return redirectWithCookies(upgradeUrl, request, response)
  }

  return null
}
