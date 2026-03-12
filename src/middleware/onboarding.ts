import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseClient, redirectWithCookies } from "./auth-guard";

export async function handleOnboarding(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  const locale = pathname.split("/")[1] || "no";
  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  const supabase = createSupabaseClient(request, response);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return response;
  }

  // EMERGENCY BYPASS: Skip onboarding checks entirely for now
  // TODO: Re-enable after fixing cookie/session issues
  const isOnboardingPage = pathWithoutLocale.startsWith("/onboarding");
  
  // Always allow access to all pages for authenticated users
  // The onboarding wizard can still be accessed manually if needed
  return response;
  
  /* DISABLED - Causing redirect loops
  // Only check onboarding if they are navigating to a protected path
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`),
  ) || pathWithoutLocale.startsWith("/onboarding");

  if (!isProtected) {
    return response;
  }

  let onboardingCompleted =
    request.cookies.get("kp_onboarding_status")?.value === "completed";

  // If cookie doesn't say completed, check DB
  if (!onboardingCompleted) {
    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_completed, setup_completed_at")
        .eq("id", user.id)
        .single() as any;

      if (
        profile &&
        (profile.onboarding_completed === true ||
          profile.setup_completed_at !== null)
      ) {
        onboardingCompleted = true;
      }

      if (onboardingCompleted) {
        response.cookies.set("kp_onboarding_status", "completed", {
          path: "/",
          maxAge: 3600 * 24 * 30,
          sameSite: "lax",
          secure: true,
          domain: getCookieDomain(request),
        });
      }
    } catch (err) {
      console.error("Error checking onboarding status:", err);
    }
  }

  // Redirect to onboarding if not completed and not already there
  if (!onboardingCompleted && !isOnboardingPage) {
    return redirectWithCookies(
      new URL(`/${locale}/onboarding`, request.url),
      request,
      response,
    );
  }

  // If onboarding IS completed, prevent them from going back to onboarding wizard
  if (onboardingCompleted && isOnboardingPage) {
    return redirectWithCookies(
      new URL(`/${locale}/dashboard`, request.url),
      request,
      response,
    );
  }

  return response;
  */
}

function getCookieDomain(request: NextRequest): string | undefined {
  const host = request.headers.get("host") || "";
  const isWWW = host.startsWith("www.");
  const rootDomain = isWWW ? host.replace("www.", "") : host;
  return rootDomain.includes(":") ? undefined : `.${rootDomain}`;
}
