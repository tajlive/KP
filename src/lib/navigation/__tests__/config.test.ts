import { describe, it, expect } from "vitest";
import {
  FALLBACK_NAVIGATION,
  GUEST_NAV_CONFIG,
  AUTH_NAV_CONFIG,
  ADMIN_NAV_CONFIG,
  MOBILE_BOTTOM_TABS,
  navigation,
  getNavByRole,
  getMobileTabs,
  APP_SHELL_PATHS,
  isAppShellPath,
  DASHBOARD_MAIN_NAV,
  DASHBOARD_TRADING_NAV,
  DASHBOARD_USER_MENU_NAV,
  DASHBOARD_COINBASE_TOP_NAV,
  DASHBOARD_COINBASE_BOTTOM_NAV,
} from "../config";
import type { NavLink, NavItem } from "../config";

describe("FALLBACK_NAVIGATION", () => {
  it("loggedOutLinks skal være enkel: Lær, Priser, Om oss", () => {
    const paths: string[] = FALLBACK_NAVIGATION.loggedOutLinks.map(
      (l: NavLink) => l.path,
    );
    expect(paths).toEqual(["/kurs", "/priser", "/om-oss"]);
  });

  it("loggedInLinks skal være kort og porteføljeførst", () => {
    const paths: string[] = FALLBACK_NAVIGATION.loggedInLinks.map(
      (l: NavLink) => l.path,
    );
    expect(paths).toEqual([
      "/dashboard",
      "/dashboard/portfolio",
      "/handel",
      "/profile",
    ]);
    expect(paths).not.toContain("/dashboard/auto-trade");
  });
});

describe("GUEST_NAV_CONFIG", () => {
  it("skal inneholde forventede sider", () => {
    const paths: string[] = GUEST_NAV_CONFIG.map((l: NavItem) => l.href);
    expect(paths).toContain("/");
    expect(paths).toContain("/kurs");
    expect(paths).toContain("/priser");
    expect(paths).toContain("/login");
  });

  it("alle items skal ha rollen guest", () => {
    for (const item of GUEST_NAV_CONFIG) {
      expect(item.roles).toContain("guest");
    }
  });
});

describe("AUTH_NAV_CONFIG", () => {
  it("skal inneholde Pilot for innloggede brukere", () => {
    const jt: NavItem | undefined = AUTH_NAV_CONFIG.find(
      (l: NavItem) => l.href === "/pilot",
    );
    expect(jt).toBeDefined();
    expect(jt!.key).toBe("pilot");
    expect(jt!.roles).toContain("auth");
  });

  it("skal ha nøkkelfunksjoner: portfolio, handel, historikk, profil", () => {
    const paths: string[] = AUTH_NAV_CONFIG.map((l: NavItem) => l.href);
    expect(paths).toContain("/dashboard/portfolio");
    expect(paths).toContain("/handel");
    expect(paths).toContain("/dashboard/historikk");
    expect(paths).toContain("/profile");
    expect(paths).toContain("/dashboard/auto-trade");
  });

  it("skal være porteføljeførst uten duplikate canonical routes", () => {
    const hrefs = AUTH_NAV_CONFIG.map((l) => l.href);
    expect(hrefs.slice(0, 4)).toEqual([
      "/dashboard/portfolio",
      "/handel",
      "/dashboard/auto-trade",
      "/profile",
    ]);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).not.toContain("/dashboard/autopilot");
  });
});

describe("ADMIN_NAV_CONFIG", () => {
  it("skal ha admin-dashboard og users", () => {
    const paths: string[] = ADMIN_NAV_CONFIG.map((l: NavItem) => l.href);
    expect(paths).toContain("/admin");
    expect(paths).toContain("/admin/users");
    expect(paths).toContain("/admin/campaign");
  });
});

describe("MOBILE_BOTTOM_TABS", () => {
  it("skal ha home, portfolio, trade og history — i den rekkefølgen", () => {
    const keys: string[] = MOBILE_BOTTOM_TABS.map((l: NavItem) => l.key);
    expect(keys).toEqual(["home", "portfolio", "trade", "history"]);
  });

  it("alle tabs skal være mobileOnly", () => {
    for (const tab of MOBILE_BOTTOM_TABS) {
      expect(tab.mobileOnly).toBe(true);
    }
  });
});

describe("navigation", () => {
  it("skal ha alle seksjoner", () => {
    expect(navigation.guest).toEqual(GUEST_NAV_CONFIG);
    expect(navigation.authenticated).toEqual(AUTH_NAV_CONFIG);
    expect(navigation.admin).toEqual(ADMIN_NAV_CONFIG);
    expect(navigation.mobile).toEqual(MOBILE_BOTTOM_TABS);
  });
});

describe("getNavByRole", () => {
  it("guest returnerer GUEST_NAV_CONFIG", () => {
    expect(getNavByRole("guest")).toEqual(GUEST_NAV_CONFIG);
  });

  it("auth returnerer AUTH_NAV_CONFIG", () => {
    expect(getNavByRole("auth")).toEqual(AUTH_NAV_CONFIG);
  });

  it("admin returnerer AUTH_NAV_CONFIG + ADMIN_NAV_CONFIG", () => {
    const result = getNavByRole("admin");
    expect(result.length).toBe(
      AUTH_NAV_CONFIG.length + ADMIN_NAV_CONFIG.length,
    );
    expect(result).toContainEqual(
      expect.objectContaining({ key: "adminDashboard" }),
    );
  });
});

describe("getMobileTabs", () => {
  it("guest returnerer tom liste", () => {
    expect(getMobileTabs("guest")).toEqual([]);
  });

  it("auth returnerer MOBILE_BOTTOM_TABS", () => {
    expect(getMobileTabs("auth")).toEqual(MOBILE_BOTTOM_TABS);
  });

  it("admin returnerer tom liste (admin har ikke mobile tabs)", () => {
    expect(getMobileTabs("admin").length).toBe(0);
  });
});

describe("isAppShellPath", () => {
  it("skal returnere true for kjente app-shell-stier", () => {
    expect(isAppShellPath("/dashboard")).toBe(true);
    expect(isAppShellPath("/handel")).toBe(true);
    expect(isAppShellPath("/marked")).toBe(true);
    expect(isAppShellPath("/pilot")).toBe(true);
    expect(isAppShellPath("/admin")).toBe(true);
  });

  it("skal returnere true for barn av app-shell-stier", () => {
    expect(isAppShellPath("/dashboard/portfolio")).toBe(true);
    expect(isAppShellPath("/dashboard/auto-trade/create")).toBe(true);
  });

  it("skal returnere false for ikke-app-shell-stier", () => {
    expect(isAppShellPath("/om-oss")).toBe(false);
    expect(isAppShellPath("/kontakt")).toBe(false);
    expect(isAppShellPath("/personvern")).toBe(false);
  });

  it("/pilot skal være i APP_SHELL_PATHS", () => {
    expect(APP_SHELL_PATHS).toContain("/pilot");
  });
});

describe("DASHBOARD_MAIN_NAV", () => {
  it("skal ha home og learn", () => {
    const keys: string[] = DASHBOARD_MAIN_NAV.map((l) => l.labelKey);
    expect(keys).toEqual(["home", "learn"]);
  });
});

describe("DASHBOARD_TRADING_NAV", () => {
  it("skal ha trade, autoTrade, history, results", () => {
    const keys: string[] = DASHBOARD_TRADING_NAV.map((l) => l.labelKey);
    expect(keys).toEqual(["trade", "autoTrade", "history", "results"]);
  });
});

describe("DASHBOARD_COINBASE_TOP_NAV", () => {
  it("skal være kort og IKKE inneholde auto-trade (fjernet 2026-08-01, Tom)", () => {
    const hrefs = DASHBOARD_COINBASE_TOP_NAV.map((l) => l.href);
    expect(hrefs).toEqual(["/dashboard", "/dashboard/portfolio", "/handel"]);
    expect(hrefs).not.toContain("/dashboard/auto-trade");
    expect(hrefs).not.toContain("/dashboard/autopilot");
  });
});

describe("DASHBOARD_COINBASE_BOTTOM_NAV", () => {
  it("skal speile mobile-first hovedflyt", () => {
    const hrefs = DASHBOARD_COINBASE_BOTTOM_NAV.map((l) => l.href);
    expect(hrefs).toEqual([
      "/dashboard",
      "/dashboard/portfolio",
      "/handel",
      "/dashboard/historikk",
    ]);
  });
});

describe("DASHBOARD_USER_MENU_NAV", () => {
  it("skal samle sekundære sider i brukermenyen (uten konto-duplikater)", () => {
    const keys: string[] = DASHBOARD_USER_MENU_NAV.map((l) => l.labelKey);
    expect(keys).toEqual([
      "history",
      "results",
      "market",
      "learn",
      "pilot",
    ]);
    expect(keys).not.toContain("settings");
    expect(keys).not.toContain("profile");
  });
});
