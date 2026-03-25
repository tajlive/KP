import { hrefWithLocale } from "@/i18n/href-with-locale";

/** next-intl keys under `dashboard.sidebar` */
export type DashboardSidebarLabelKey =
  | "home"
  | "learn"
  | "trade"
  | "history"
  | "results"
  | "autoTrade"
  | "profile"
  | "settings"
  | "admin";

export type DashboardMainNavItem = {
  href: string;
  labelKey: DashboardSidebarLabelKey;
  exact?: boolean;
};

export type DashboardTradingNavItem = DashboardMainNavItem & {
  /** Ekstra stier (uten locale-prefix) som skal markere denne lenken aktiv, f.eks. bot-detalj under auto-trade */
  alsoActiveForPathPrefixes?: string[];
};

/** Rekkefølge: utførelse (paper-hub → start bot) → sporbarhet (historikk → resultater) */
export const DASHBOARD_MAIN_NAV: readonly DashboardMainNavItem[] = [
  { href: "/dashboard", labelKey: "home", exact: true },
  { href: "/kurs", labelKey: "learn" },
];

export const DASHBOARD_TRADING_NAV: readonly DashboardTradingNavItem[] = [
  { href: "/paper-trading", labelKey: "trade" },
  {
    href: "/dashboard/auto-trade",
    labelKey: "autoTrade",
    alsoActiveForPathPrefixes: ["/dashboard/bot"],
  },
  { href: "/handelshistorikk", labelKey: "history" },
  { href: "/dashboard/resultater", labelKey: "results" },
];

/**
 * Aktiv markering for sidebar: matcher lokalisert `href`, eller valgfrie ekstra prefiks (f.eks. /dashboard/bot/* for «Start bot»).
 */
export function isDashboardSidebarLinkActive(
  pathname: string,
  locale: string,
  href: string,
  options?: { exact?: boolean; alsoActiveForPathPrefixes?: string[] },
): boolean {
  const p = pathname ?? "/";
  const fullPath = hrefWithLocale(locale, href);
  const exact = options?.exact ?? false;

  if (exact) {
    if (p === fullPath) return true;
  } else if (p === fullPath || p.startsWith(`${fullPath}/`)) {
    return true;
  }

  const extras = options?.alsoActiveForPathPrefixes ?? [];
  for (const prefix of extras) {
    const pre = prefix.startsWith("/") ? prefix : `/${prefix}`;
    const localized = hrefWithLocale(locale, pre);
    if (p === localized || p.startsWith(`${localized}/`)) {
      return true;
    }
  }

  return false;
}
