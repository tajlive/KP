import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handleI18nRedirect } from "./middleware/i18n";
import { handleRateLimit } from "./middleware/rate-limit";
import { handleOAuthRedirect } from "./middleware/oauth";
import { handleAuthGuard } from "./middleware/auth-guard";
import { handleOnboarding } from "./middleware/onboarding";

export async function middleware(request: NextRequest) {
  // 1. 🌍 i18n redirect (auto-detect browser language)
  const i18nResponse = handleI18nRedirect(request);
  if (i18nResponse) return i18nResponse;

  // 2. 🔥 API rate limiting
  const rateLimitResponse = await handleRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  // 3. 🚀 Catch orphaned OAuth codes
  const oauthResponse = handleOAuthRedirect(request);
  if (oauthResponse) return oauthResponse;

  // 4. 🔒 Auth guard (protected paths)
  const authResponse = await handleAuthGuard(request);
  if (authResponse && authResponse.status !== 200) {
    // If it's a redirect (not 200), return it
    return authResponse;
  }

  // 5. 📚 Onboarding flow (currently disabled - see onboarding.ts)
  const onboardingResponse = await handleOnboarding(request);
  if (onboardingResponse && onboardingResponse.status !== 200) {
    return onboardingResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/|_vercel).*)",
  ],
};
