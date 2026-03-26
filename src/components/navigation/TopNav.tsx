"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Bell, Settings, User } from "lucide-react";
import { HStack } from "@coinbase/cds-web/layout";
import { Text } from "@coinbase/cds-web/typography";
import { Button } from "@coinbase/cds-web/buttons";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import {
  DASHBOARD_COINBASE_TOP_NAV,
  isDashboardSidebarLinkActive,
} from "@/lib/navigation/dashboard-links";

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
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-[#0052FF]/10 text-[#0052FF]"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  );
}

export function TopNav() {
  const locale = useLocale();
  const pathname = usePathname() ?? "/";
  const t = useTranslations("dashboard.sidebar");

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-4 lg:px-8">
        <HStack className="min-w-0 items-center gap-1 sm:gap-2">
          <Link
            href={hrefWithLocale(locale, "/dashboard")}
            className="mr-1 shrink-0 sm:mr-4"
          >
            <Text
              as="span"
              className="text-lg font-bold text-slate-900 sm:text-xl"
            >
              Klarpakke
            </Text>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
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
        </HStack>

        <HStack className="shrink-0 items-center gap-1 sm:gap-2">
          <Button
            as={Link}
            href={hrefWithLocale(locale, "/dashboard/settings")}
            variant="secondary"
            compact
            aria-label={t("settings")}
            title={t("settings")}
            className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0"
            start={<Settings className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">{t("settings")}</span>
          </Button>
          <Button
            as={Link}
            href={hrefWithLocale(locale, "/varsler")}
            variant="secondary"
            compact
            aria-label={t("alerts")}
            title={t("alerts")}
            className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0"
            start={<Bell className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">{t("alerts")}</span>
          </Button>
          <Button
            as={Link}
            href={hrefWithLocale(locale, "/profile")}
            variant="secondary"
            compact
            aria-label={t("profile")}
            title={t("profile")}
            className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0"
            start={<User className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">{t("profile")}</span>
          </Button>
        </HStack>
      </div>
    </header>
  );
}
