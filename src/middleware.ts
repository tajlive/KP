import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'
import { handleOnboarding } from './middleware/onboarding'

const handleI18nRouting = createMiddleware(routing)

// Auth-beskyttede ruter
const PROTECTED_PATHS = [
  '/dashboard',
  '/innstillinger',
  '/beta',
  '/admin',
  '/onboarding',
  '/checkout',
  '/akademi',
  '/paper-trading',
  '/auto-trading',
  '/konto',
  '/handelshistorikk',
  '/varsler',
  '/leagues',
  '/copy-trading',
  '/marketplace',
  '/profile',
  '/quiz',
]

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. Håndter i18n routing (locale-deteksjon, redirects, rewrites)
  const response = handleI18nRouting(request)

  // 2. Hvis i18n gjorde en redirect → returner den
  if (response.status !== 200) {
    return response
  }

  // 3. Hent locale fra pathname
  const locale = pathname.split('/')[1] || 'no'
  const strippedPath = pathname.replace(/^\/(no|en)/, '') || '/'

  // 4. Auth-guard: sjekk om ruten er beskyttet
  const isProtected = PROTECTED_PATHS.some(p => strippedPath.startsWith(p))

  if (isProtected) {
    // Supabase SSR uses sb-<projectRef>-auth-token (or chunked: .0, .1, …)
    const hasSession = request.cookies.getAll().some(
      c => c.name === 'sb-access-token' ||
           c.name.startsWith('sb-') && c.name.includes('-auth-token')
    )
    if (!hasSession) {
      const loginUrl = new URL(`/${locale}/innlogging`, request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
    // Onboarding: redirect to /onboarding if not completed (only for protected paths with session)
    const onboardingResult = await handleOnboarding(request, response)
    if (onboardingResult) return onboardingResult
  }

  return response
}

export const config = {
  matcher: [
    // Match alle pathname unntatt api, _next, _vercel og statiske filer
    '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
  ],
}
