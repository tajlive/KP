"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import {
  DASHBOARD_COINBASE_TOP_NAV,
  isDashboardSidebarLinkActive,
} from "@/lib/navigation/config";
import { UserMenu } from "./UserMenu";
import { useServerVerifiedUser } from "@/lib/auth/use-server-verified-user";
import { useActiveTraderSessions } from "./use-active-trader-sessions";

function TopNavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? "bg-kp-brand/10 text-kp-brand"
          : "text-kp-text-secondary hover:bg-kp-bg-hover hover:text-kp-text-primary"
      }`}
    >
      {label}
    </Link>
  );
}

function ActiveTraderPill({ locale }: { locale: string }) {
  const sessions = useActiveTraderSessions();

  const activeCount = sessions.length;
  if (activeCount === 0) return null;

  const hasLive = sessions.some((session) => session.mode === "live");
  const label = locale === "en" ? "Auto-trading active" : "Auto-handel aktiv";
  const countLabel = activeCount > 1 ? ` (${activeCount})` : "";

  return (
    <Link
      href={hrefWithLocale(locale, hasLive ? "/handel?mode=live" : "/handel")}
      className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors sm:flex ${
        hasLive
          ? "border-kp-danger/40 bg-kp-danger/15 text-kp-danger hover:bg-kp-danger/25"
          : "border-kp-success/40 bg-kp-success/15 text-kp-success hover:bg-kp-success/25"
      }`}
      aria-label={`${label}${countLabel}`}
      title={`${label}${countLabel}`}
    >
      <span className="relative flex h-2.5 w-2.5" aria-hidden>
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
            hasLive ? "bg-kp-danger" : "bg-kp-success"
          }`}
        />
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
            hasLive ? "bg-kp-danger" : "bg-kp-success"
          }`}
        />
      </span>
      <Activity className="h-3.5 w-3.5" aria-hidden />
      <span>
        {label}
        {countLabel}
      </span>
    </Link>
  );
}

export function TopNav() {
  const locale = useLocale();
  const pathname = usePathname() ?? "/";
  const t = useTranslations("dashboard.sidebar");
  const { user, loading: authLoading } = useServerVerifiedUser();
  const isAuthenticated = !!user;

  // (user)-gruppen er beskyttet av requireAuth server-side — en bruker som
  // ser denne headeren ER innlogget per definisjon. Mens AuthContext loader
  // (HttpOnly-cookie-sesjon resolver asynkront) viser vi app-headeren, ALDRI
  // guest-CTA-er. Før denne fiksen viste headeren «Logg inn / Start gratis»
  // til innloggede brukere i prod fordi AuthContext.user var null i første
  // render (flash of wrong state).
  if (!isAuthenticated && authLoading) {
    return (
      <header className="sticky top-0 z-30 border-b border-kp-border bg-kp-bg-secondary/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-4 lg:px-8">
          <Link
            href={hrefWithLocale(locale, "/dashboard")}
            className="shrink-0"
          >
            <span className="text-lg font-bold text-kp-text-primary sm:text-xl">
              Klarpakke
            </span>
          </Link>
        </div>
      </header>
    );
  }

  // Unauthenticated (auth-resolved, faktisk utlogget): minimal header med login CTA
  if (!isAuthenticated) {
    return (
      <header className="sticky top-0 z-30 border-b border-kp-border bg-kp-bg-secondary/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-4 lg:px-8">
          <Link href={hrefWithLocale(locale, "/")} className="shrink-0">
            <span className="text-lg font-bold text-kp-text-primary sm:text-xl">
              Klarpakke
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={hrefWithLocale(locale, "/login")}
              className="rounded-lg px-3 py-2 text-sm font-medium text-kp-text-secondary hover:bg-kp-bg-hover hover:text-kp-text-primary transition-colors"
            >
              {locale === "en" ? "Log in" : "Logg inn"}
            </Link>
            <Link
              href={hrefWithLocale(locale, "/register")}
              className="rounded-lg bg-kp-brand px-4 py-2 text-sm font-semibold text-white hover:bg-kp-brand/90 transition-colors"
            >
              {locale === "en" ? "Start free" : "Start gratis"}
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // Authenticated: full app shell header
  return (
    <header className="sticky top-0 z-30 border-b border-kp-border bg-kp-bg-secondary/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <Link
            href={hrefWithLocale(locale, "/dashboard")}
            className="mr-1 shrink-0 sm:mr-4"
          >
            <span className="text-lg font-bold text-kp-text-primary sm:text-xl">
              Klarpakke
            </span>
          </Link>

          <nav className="hidden min-w-0 items-center gap-1 overflow-x-auto md:flex [scrollbar-width:none]">
            {DASHBOARD_COINBASE_TOP_NAV.map((item) => (
              <TopNavLink
                key={item.href}
                href={hrefWithLocale(locale, item.href)}
                label={t(item.labelKey)}
                active={isDashboardSidebarLinkActive(
                  pathname,
                  locale,
                  item.href,
                  item.exact ? { exact: true } : undefined,
                )}
              />
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ActiveTraderPill locale={locale} />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
