/**
 * Sentral navigasjonskonfigurasjon for Klarpakke.
 *
 * Dette er single source of truth for all navigasjonsdata, app-shell-stier og
 * hjelpefunksjoner for aktiv markering. Data som tidligere var spredt over
 * `dashboard-links.ts`, `load-navigation.ts` og `marketing-shell-paths.ts` er
 * samlet her; de opprinnelige filene er slettet og importerene peker hit.
 */

import { hrefWithLocale } from "@/i18n/href-with-locale";

export type NavRole = "guest" | "auth" | "admin";

export interface NavItem {
  key: string;
  href: string;
  labelKey: string;
  icon?: string;
  roles: NavRole[];
  children?: NavItem[];
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Marketing / shell navigasjon
// ─────────────────────────────────────────────────────────────────────────────

/** Navigasjon for gjester (ikke innlogget). */
export const GUEST_NAV_CONFIG: NavItem[] = [
  {
    key: "home",
    href: "/",
    labelKey: "navigation.home",
    roles: ["guest"],
  },
  {
    key: "courses",
    href: "/kurs",
    labelKey: "navigation.courses",
    icon: "BookOpen",
    roles: ["guest"],
  },
  {
    key: "pricing",
    href: "/priser",
    labelKey: "navigation.pricing",
    roles: ["guest"],
  },
  {
    key: "login",
    href: "/login",
    labelKey: "navigation.login",
    roles: ["guest"],
  },
];

/** Hovednavigasjon for autentiserte brukere. */
export const AUTH_NAV_CONFIG: NavItem[] = [
  {
    key: "portfolio",
    href: "/dashboard/portfolio",
    labelKey: "dashboard.sidebar.portfolio",
    icon: "PieChart",
    roles: ["auth"],
  },
  {
    key: "trade",
    href: "/handel",
    labelKey: "dashboard.sidebar.trade",
    icon: "TrendingUp",
    roles: ["auth"],
  },
  {
    key: "autoTrade",
    href: "/dashboard/auto-trade",
    labelKey: "dashboard.sidebar.autoTrade",
    icon: "Bot",
    roles: ["auth"],
  },
  {
    key: "account",
    href: "/profile",
    labelKey: "navigation.account",
    icon: "User",
    roles: ["auth"],
  },
  // Sekundære flyter beholdes utenfor primærnav
  {
    key: "home",
    href: "/dashboard",
    labelKey: "dashboard.sidebar.home",
    icon: "Home",
    roles: ["auth"],
  },
  {
    key: "market",
    href: "/marked",
    labelKey: "navigation.market",
    icon: "Globe",
    roles: ["auth"],
  },
  {
    key: "history",
    href: "/dashboard/historikk",
    labelKey: "dashboard.sidebar.history",
    icon: "History",
    roles: ["auth"],
  },
  {
    key: "courses",
    href: "/kurs",
    labelKey: "navigation.courses",
    icon: "BookOpen",
    roles: ["auth"],
  },
  {
    key: "pilot",
    href: "/pilot",
    labelKey: "navigation.pilot",
    icon: "Zap",
    roles: ["auth"],
  },
];

/** Admin-navigasjon. */
export const ADMIN_NAV_CONFIG: NavItem[] = [
  {
    key: "adminDashboard",
    href: "/admin",
    labelKey: "admin.nav.dashboard",
    icon: "Shield",
    roles: ["admin"],
  },
  {
    key: "adminUsers",
    href: "/admin/users",
    labelKey: "admin.nav.users",
    icon: "Users",
    roles: ["admin"],
  },
  {
    key: "adminCampaign",
    href: "/admin/campaign",
    labelKey: "admin.nav.campaign",
    icon: "Megaphone",
    roles: ["admin"],
  },
];

/** Mobil-bottom-tabs — fire kjerneflyter (mobil er primærflaten). */
export const MOBILE_BOTTOM_TABS: NavItem[] = [
  {
    key: "home",
    href: "/dashboard",
    labelKey: "navigation.home",
    icon: "Home",
    roles: ["auth"],
    mobileOnly: true,
  },
  {
    key: "portfolio",
    href: "/dashboard/portfolio",
    labelKey: "navigation.portfolio",
    icon: "PieChart",
    roles: ["auth"],
    mobileOnly: true,
  },
  {
    key: "trade",
    href: "/handel",
    labelKey: "navigation.trade",
    icon: "TrendingUp",
    roles: ["auth"],
    mobileOnly: true,
  },
  {
    key: "history",
    href: "/dashboard/historikk",
    labelKey: "navigation.history",
    icon: "History",
    roles: ["auth"],
    mobileOnly: true,
  },
];

/** Enhetlig navigasjonsobjekt. */
export const navigation = {
  guest: GUEST_NAV_CONFIG,
  authenticated: AUTH_NAV_CONFIG,
  admin: ADMIN_NAV_CONFIG,
  mobile: MOBILE_BOTTOM_TABS,
  footer: [] as NavItem[],
  legal: [] as NavItem[],
} as const;

/** Hjelpefunksjon for å filtrere nav etter rolle. */
export function getNavByRole(role: NavRole): NavItem[] {
  switch (role) {
    case "admin":
      return [...AUTH_NAV_CONFIG, ...ADMIN_NAV_CONFIG];
    case "auth":
      return AUTH_NAV_CONFIG;
    case "guest":
    default:
      return GUEST_NAV_CONFIG;
  }
}

/** Hjelpefunksjon for å hente mobil-tabs. */
export function getMobileTabs(role: NavRole): NavItem[] {
  if (role === "guest") return [];
  return MOBILE_BOTTOM_TABS.filter((item) => item.roles.includes(role));
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard-navigasjon
// ─────────────────────────────────────────────────────────────────────────────

/** next-intl keys under `dashboard.sidebar`. */
export type DashboardSidebarLabelKey =
  | "home"
  | "learn"
  | "trade"
  | "history"
  | "results"
  | "autoTrade"
  | "ai"
  | "forYou"
  | "portfolio"
  | "profile"
  | "settings"
  | "admin"
  | "taxReport"
  | "pilot"
  | "analysis"
  | "market";

export type DashboardMainNavItem = {
  href: string;
  labelKey: DashboardSidebarLabelKey;
  exact?: boolean;
};

export type DashboardTradingNavItem = DashboardMainNavItem & {
  /** Ekstra stier (uten locale-prefix) som skal markere denne lenken aktiv, f.eks. bot-detalj under auto-trade */
  alsoActiveForPathPrefixes?: string[];
};

export type CoinbaseNavItem = DashboardMainNavItem;

/** Rekkefølge: utførelse (paper-hub → start bot) → sporbarhet (historikk → resultater) */
export const DASHBOARD_MAIN_NAV: readonly DashboardMainNavItem[] = [
  { href: "/dashboard", labelKey: "home", exact: true },
  { href: "/kurs", labelKey: "learn" },
];

export const DASHBOARD_TRADING_NAV: readonly DashboardTradingNavItem[] = [
  { href: "/handel", labelKey: "trade" },
  {
    href: "/dashboard/auto-trade",
    labelKey: "autoTrade",
    alsoActiveForPathPrefixes: ["/dashboard/bot", "/dashboard/auto-trade"],
  },
  { href: "/dashboard/historikk", labelKey: "history" },
  { href: "/dashboard/resultater", labelKey: "results" },
];

export const DASHBOARD_COINBASE_TOP_NAV: readonly CoinbaseNavItem[] = [
  { href: "/dashboard", labelKey: "home", exact: true },
  { href: "/dashboard/portfolio", labelKey: "portfolio" },
  { href: "/handel", labelKey: "trade" },
  // Auto-trade fjernet fra toppmeny 2026-08-01 (Tom): nås via Mer → Pilot / sidebar.
];

/** Speiler MOBILE_BOTTOM_TABS (4 faner: hjem, portefølje, handel, historikk). */
export const DASHBOARD_COINBASE_BOTTOM_NAV: readonly CoinbaseNavItem[] = [
  { href: "/dashboard", labelKey: "home", exact: true },
  { href: "/dashboard/portfolio", labelKey: "portfolio" },
  { href: "/handel", labelKey: "trade" },
  { href: "/dashboard/historikk", labelKey: "history" },
];

/**
 * Sekundære sider i brukermenyen (avatar-meny i TopNav).
 * Profil og Innstillinger ligger som egne kontopunkter i menyen og skal
 * derfor ikke dupliseres her.
 */
export const DASHBOARD_USER_MENU_NAV: readonly CoinbaseNavItem[] = [
  { href: "/dashboard/historikk", labelKey: "history" },
  { href: "/dashboard/resultater", labelKey: "results" },
  { href: "/marked", labelKey: "market" },
  { href: "/kurs", labelKey: "learn" },
  { href: "/pilot", labelKey: "pilot" },
];

export const dashboardNavigation = {
  main: DASHBOARD_MAIN_NAV,
  trading: DASHBOARD_TRADING_NAV,
  coinbaseTop: DASHBOARD_COINBASE_TOP_NAV,
  coinbaseBottom: DASHBOARD_COINBASE_BOTTOM_NAV,
  userMenu: DASHBOARD_USER_MENU_NAV,
} as const;

/**
 * Aktiv markering for sidebar: matcher lokalisert `href`, eller valgfrie ekstra
 * prefiks (f.eks. /dashboard/bot/* for «Start bot»).
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

// ─────────────────────────────────────────────────────────────────────────────
// Sanity-markedsføringsnavigasjon
// ─────────────────────────────────────────────────────────────────────────────

export interface NavLink {
  label: string;
  path: string;
  order: number;
}

export interface NavigationData {
  loggedOutLinks: NavLink[];
  loggedInLinks: NavLink[];
}

/** Fallback-data når Sanity ikke er tilgjengelig. */
export const FALLBACK_NAVIGATION: NavigationData = {
  loggedOutLinks: [
    { label: "Lær", path: "/kurs", order: 0 },
    { label: "Priser", path: "/priser", order: 1 },
    { label: "Om oss", path: "/om-oss", order: 2 },
  ],
  loggedInLinks: [
    { label: "Hjem", path: "/dashboard", order: 0 },
    { label: "Portefølje", path: "/dashboard/portfolio", order: 1 },
    { label: "Handel", path: "/handel", order: 2 },
    { label: "Konto", path: "/profile", order: 3 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// App-shell stier (tidligere marketing-shell-paths.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ruter som renderer full app chrome (sidebar, dashboard, trading, checkout,
 * osv.) istedenfor marketing shell.
 */
export const APP_SHELL_PATHS: readonly string[] = [
  "/dashboard",
  "/copy-trading",
  "/marketplace",
  "/admin",
  "/checkout",
  "/onboarding",
  "/akademi",
  "/konto",
  "/handel",
  "/pilot",
  "/marked",
  "/leagues",
  "/leaderboard",
  "/profile",
  "/innstillinger",
  "/callback",
];

/** Returns true when `strippedPath` is (or lives under) an app-shell route. */
export function isAppShellPath(strippedPath: string): boolean {
  return APP_SHELL_PATHS.some(
    (p) => strippedPath === p || strippedPath.startsWith(`${p}/`),
  );
}
