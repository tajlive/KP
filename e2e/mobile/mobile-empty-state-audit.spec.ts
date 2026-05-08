import { test, expect } from "@playwright/test";

/**
 * Mobile Empty State Audit
 *
 * Tester at alle nøkkel-sider har synlig innhold på mobil — ikke bare
 * hardkodede titler/knapper uten dynamisk data eller tomme områder.
 *
 * Problem-mønster som fanges:
 * - Side laster, men hovedinnholdet er tomt (bare hero + knapper)
 * - Charts/KPI vises ikke på mobil
 * - Horizontal scroll
 * - Bottom-nav overlapper innhold
 */

const MOBILE_VIEWPORT = { width: 390, height: 844 };

// Ruter som krever innlogging
const AUTH_ROUTES = [
  "/no/dashboard",
  "/no/dashboard/resultater",
  "/no/dashboard/portfolio",
  "/no/dashboard/handelshistorikk",
  "/no/dashboard/settings",
  "/no/dashboard/referral",
  "/no/dashboard/ai",
  "/no/dashboard/auto-trade",
  "/no/profile",
  "/no/varsler",
];

// Offentlige ruter (landing, marketing, legal)
const PUBLIC_ROUTES = [
  "/no",
  "/no/priser",
  "/no/om-oss",
  "/no/kontakt",
  "/no/hjelp",
  "/no/binance-guide",
  "/no/kalkulator",
  "/no/personvern",
  "/no/vilkar",
  "/no/copy-trading",
  "/no/leaderboard",
  "/no/tradere",
  "/no/paper-trading",
  "/no/live-trading",
];

function isLoginUrl(url: string) {
  return url.includes("innlogging") || url.includes("/login");
}

test.describe("Mobile Empty State Audit @mobile @audit", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  // ========================================================================
  // 1. Offentlige sider — skal ALLTID ha synlig innhold
  // ========================================================================
  for (const route of PUBLIC_ROUTES) {
    test(`public: ${route} har synlig hovedinnhold`, async ({ page }) => {
      await page.goto(route, { timeout: 30000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);

      // Sjekk at body har mer enn bare header/nav
      const mainContentHeight = await page.evaluate(() => {
        const main = document.querySelector("main");
        return main ? main.scrollHeight : document.body.scrollHeight;
      });

      expect(mainContentHeight).toBeGreaterThan(400);

      // Ingen horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasOverflow).toBe(false);

      // Skal ha minst ett bilde, en knapp, eller en seksjon med tekst
      const hasVisibleContent = await page.evaluate(() => {
        const selectors = ["img", "button", "h1", "h2", "section", "article"];
        return selectors.some((s) => document.querySelectorAll(s).length > 0);
      });
      expect(hasVisibleContent).toBe(true);
    });
  }

  // ========================================================================
  // 2. Innloggede sider — skal ha synlig innhold ELLER tydelig empty-state
  // ========================================================================
  for (const route of AUTH_ROUTES) {
    test(`auth: ${route} — sjekk for tomt innhold`, async ({ page }) => {
      await page.goto(route, { timeout: 60000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(3000);

      // Hvis redirected til login, skip
      if (isLoginUrl(page.url())) {
        test.skip(true, "Krever innlogget bruker");
        return;
      }

      // Sjekk om hovedinnholdet er unormalt kort (indikerer "bare hardkodet tekst")
      const metrics = await page.evaluate(() => {
        const main = document.querySelector("main");
        const bodyText = document.body.innerText;
        // Tell antall "meningsfulle" blokker (ikke bare header/footer)
        const sections = document.querySelectorAll("section, article, [class*='card'], [class*='panel']").length;
        return {
          mainHeight: main ? main.scrollHeight : 0,
          bodyTextLength: bodyText.length,
          sectionCount: sections,
        };
      });

      // Hvis main er < 300px og få seksjoner, er siden sannsynligvis "tom"
      if (metrics.mainHeight < 300 && metrics.sectionCount < 2) {
        // Ta screenshot for debugging
        await page.screenshot({
          path: `e2e/mobile/screenshots/empty-${route.replace(/\//g, "-")}.png`,
          fullPage: true,
        });
      }

      // Forvent at siden enten har innhold ELLER en tydelig empty-state
      expect(metrics.mainHeight).toBeGreaterThan(200);
      expect(metrics.bodyTextLength).toBeGreaterThan(100);
    });
  }

  // ========================================================================
  // 3. /resultater spesifikk — skal ha KPI-kort eller empty-state
  // ========================================================================
  test("/resultater har synlige KPI-kort eller empty-state", async ({ page }) => {
    await page.goto("/no/dashboard/resultater", { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);

    if (isLoginUrl(page.url())) {
      test.skip(true, "Krever innlogget bruker");
      return;
    }

    // Enten KPI-kort eller empty-state skal være synlig
    const kpiCard = page.locator("[class*='font-mono']").first();
    const emptyState = page.locator("text=Ingen trader ennå").or(page.locator("text=No trades yet")).first();
    const errorAlert = page.locator("[role='alert']").first();

    const hasKpi = await kpiCard.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasError = await errorAlert.isVisible().catch(() => false);

    expect(hasKpi || hasEmpty || hasError).toBe(true);

    // Sjekk at det ikke er horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  // ========================================================================
  // 4. Bottom-nav overlapper ikke innhold
  // ========================================================================
  test("bottom-nav overlapper ikke innhold på /dashboard", async ({ page }) => {
    await page.goto("/no/dashboard", { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);

    if (isLoginUrl(page.url())) {
      test.skip(true, "Krever innlogget bruker");
      return;
    }

    // Scroll til bunn
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Sjekk at siste synlige element ikke er skjult av bottom-nav
    const lastElementVisible = await page.evaluate(() => {
      const nav = document.querySelector("nav[class*='fixed bottom']");
      const navHeight = nav ? nav.getBoundingClientRect().height : 80;
      const lastEl = document.querySelector("main > *:last-child");
      if (!lastEl) return true;
      const rect = lastEl.getBoundingClientRect();
      return rect.bottom < window.innerHeight - navHeight + 20;
    });

    expect(lastElementVisible).toBe(true);
  });
});
