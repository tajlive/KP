import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing.config";
import {
  localizedPathname,
  parseLocalePath,
} from "./locale-path";

export const SUPPORTED_LOCALES = ["no", "en", "th", "zh"] as const;

const handleI18nRouting = createMiddleware(routing);

const CANONICAL_REDIRECTS: { [key: string]: string } = {
  "/dashboard/activity": "/handelshistorikk",
  "/dashboard/trading": "/dashboard/trade",
  "/dashboard/innstillinger": "/dashboard/settings",
  "/trade": "/dashboard/trade",
  "/auto-trading": "/dashboard/auto-trade",
  "/auto-trading-ai": "/dashboard/auto-trade",
  "/innlogging": "/login",
  "/registrer": "/register",
  "/paper": "/paper-trading",
};

export function i18nMiddleware(
  request: NextRequest,
): NextResponse | Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  
  // KRITISK: Ikke redirect auth/callback - det ødelegger OAuth PKCE flyten
  // Route handleren ligger i app/[locale]/auth/callback/ og trenger locale prefix
  if (pathname.includes("/auth/callback")) {
    const res = NextResponse.next();
    res.headers.set("x-kp-auth-callback", "skipped-i18n");
    return res;
  }

  const host = request.headers.get("host") || "";

  // 1. Canonical redirect for *.vercel.app
  if (host.endsWith(".vercel.app") && process.env.NEXT_PUBLIC_APP_URL) {
    const canonical = new URL(process.env.NEXT_PUBLIC_APP_URL);
    const url = request.nextUrl.clone();
    url.hostname = canonical.hostname;
    url.port = "";
    url.protocol = canonical.protocol;
    return NextResponse.redirect(url, { status: 308 });
  }

  const { locale, strippedPath } = parseLocalePath(pathname);

  // 2. PKCE callback on root with ?code=
  if (strippedPath === "/" && request.nextUrl.searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = localizedPathname(locale, "/auth/callback");
    return NextResponse.redirect(url, 302);
  }

  // 3. Beta removal redirects
  if (strippedPath === "/beta" || strippedPath.startsWith("/beta/")) {
    const url = request.nextUrl.clone();
    if (strippedPath.includes("live-trading")) {
      url.pathname = localizedPathname(locale, "/paper-trading");
      url.searchParams.set("mode", "live");
    } else if (strippedPath.includes("auto-trade")) {
      url.pathname = localizedPathname(locale, "/dashboard/auto-trade");
    } else if (strippedPath.includes("connect-exchange")) {
      url.pathname = localizedPathname(locale, "/dashboard");
    } else {
      url.pathname = localizedPathname(locale, "/dashboard");
    }
    return NextResponse.redirect(url, 308);
  }

  // 4. English alias /settings -> innstillinger
  if (strippedPath === "/settings" || strippedPath.startsWith("/settings/")) {
    const tail =
      strippedPath === "/settings"
        ? ""
        : strippedPath.slice("/settings".length);
    const target = `/innstillinger${tail}`;
    return NextResponse.redirect(
      new URL(localizedPathname(locale, target), request.url),
      308,
    );
  }

  // KLA-238: Profile consolidation redirects (temporary 307)
  if (strippedPath === "/konto" || strippedPath.startsWith("/konto/")) {
    const target = "/profile/wallet";
    return NextResponse.redirect(
      new URL(localizedPathname(locale, target), request.url),
      307,
    );
  }
  if (strippedPath === "/innstillinger" || strippedPath.startsWith("/innstillinger/")) {
    const target = "/profile/settings";
    return NextResponse.redirect(
      new URL(localizedPathname(locale, target), request.url),
      307,
    );
  }

  // 5. Canonical redirects
  for (const [from, to] of Object.entries(CANONICAL_REDIRECTS)) {
    if (strippedPath === from || strippedPath.startsWith(`${from}/`)) {
      const dest = to.startsWith("/") ? to : `/${to}`;
      return NextResponse.redirect(
        new URL(localizedPathname(locale, dest), request.url),
        308,
      );
    }
  }

  // 6. Enrich request headers for downstream middleware
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-kp-stripped-path", strippedPath);
  requestHeaders.set("x-kp-locale", locale);
  const requestWithPath = new NextRequest(request, { headers: requestHeaders });

  // 7. next-intl routing
  return handleI18nRouting(requestWithPath);
}
