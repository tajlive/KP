import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseClient, redirectWithCookies } from "./auth-guard";
import { parseLocalePath } from "./locale-path";

const PROTECTED_PATHS = [
  "/dashboard",
  "/innstillinger",
  "/admin",
  "/checkout",
  "/akademi",
  "/paper-trading",
  "/auto-trading",
  "/konto",
  "/handelshistorikk",
  "/varsler",
  "/leagues",
  "/copy-trading",
  "/marketplace",
  "/profile",
  "/quiz",
];

export async function handleOnboarding(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const { locale, strippedPath: pathWithoutLocale } = parseLocalePath(pathname);

  const isOnboardingPage = pathWithoutLocale.startsWith("/onboarding");

  // Only run onboarding check on protected paths (not on onboarding wizard itself when already there)
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`),
  );

  if (!isProtected && !isOnboardingPage) {
    return null;
  }

  const supabase = createSupabaseClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Prefer cookie to avoid DB hit every request; cookie is set only after DB confirms completed
  let onboardingCompleted =
    request.cookies.get("kp_onboarding_status")?.value === "completed";

  if (!onboardingCompleted) {
    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_completed, setup_completed_at")
        .eq("id", user.id)
        .maybeSingle();

      if (
        profile &&
        (profile.onboarding_completed === true ||
          profile.setup_completed_at != null)
      ) {
        onboardingCompleted = true;
      }

      if (onboardingCompleted) {
        const host = request.headers.get("host") || "";
        const isLocalhost =
          host.startsWith("localhost") || host.startsWith("127.0.0.1");
        response.cookies.set("kp_onboarding_status", "completed", {
          path: "/",
          maxAge: 3600 * 24 * 30,
          sameSite: "lax",
          secure: !isLocalhost,
          ...(isLocalhost ? {} : { domain: getCookieDomain(request) }),
        });
      }
    } catch (err) {
      console.error("Error checking onboarding status:", err);
    }
  }

  // Fullført onboarding: ikke la brukeren henge i veiviseren
  if (isOnboardingPage && onboardingCompleted) {
    return redirectWithCookies(
      new URL(`/${locale}/dashboard`, request.url),
      request,
      response,
    );
  }

  return null;
}

function getCookieDomain(request: NextRequest): string | undefined {
  const host = request.headers.get("host") || "";
  const isWWW = host.startsWith("www.");
  const rootDomain = isWWW ? host.replace("www.", "") : host;
  return rootDomain.includes(":") ? undefined : `.${rootDomain}`;
}
