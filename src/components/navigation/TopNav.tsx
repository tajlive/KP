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
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <HStack className="items-center gap-2">
          <Link href={hrefWithLocale(locale, "/dashboard")} className="mr-4">
            <Text as="span" className="text-xl font-bold text-slate-900">
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

        <HStack className="items-center gap-2">
          <Button
            as={Link}
            href={hrefWithLocale(locale, "/dashboard/settings")}
            variant="secondary"
            compact
            start={<Settings className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">{t("settings")}</span>
          </Button>
          <Button
            as={Link}
            href={hrefWithLocale(locale, "/varsler")}
            variant="secondary"
            compact
            start={<Bell className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">{t("alerts")}</span>
          </Button>
          <Button
            as={Link}
            href={hrefWithLocale(locale, "/profile")}
            variant="secondary"
            compact
            start={<User className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">{t("profile")}</span>
          </Button>
        </HStack>
      </div>
    </header>
  );
}
