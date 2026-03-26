"use client";

import Link from "next/link";
import { type ComponentType } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Home, LineChart, Sparkles, Wallet } from "lucide-react";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import {
  DASHBOARD_COINBASE_BOTTOM_NAV,
  isDashboardSidebarLinkActive,
} from "@/lib/navigation/dashboard-links";

const iconByHref: Record<string, ComponentType<{ className?: string }>> = {
  "/dashboard": Home,
  "/dashboard/trade": LineChart,
  "/dashboard/ai": Sparkles,
  "/dashboard/portfolio": Wallet,
};

export function BottomTabs() {
  const locale = useLocale();
  const pathname = usePathname() ?? "/";
  const t = useTranslations("dashboard.sidebar");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-4 gap-1">
        {DASHBOARD_COINBASE_BOTTOM_NAV.map((item) => {
          const active = isDashboardSidebarLinkActive(
            pathname,
            locale,
            item.href,
            item.exact ? { exact: true } : undefined,
          );
          const Icon = iconByHref[item.href] ?? Home;
          return (
            <li key={item.href}>
              <Link
                href={hrefWithLocale(locale, item.href)}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-medium ${
                  active
                    ? "bg-[#0052FF]/10 text-[#0052FF]"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
