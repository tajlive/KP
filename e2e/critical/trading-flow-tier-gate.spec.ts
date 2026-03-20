import { test, expect } from "@playwright/test";

/**
 * Trading flow + tier-gate (ANBEFALINGER)
 * - Handle → /paper-trading
 * - Ingen lenker til /live-trading/[id] eller /beta
 * - /beta omdirigeres til dashboard eller paper-trading?mode=live
 */

test.describe("Trading flow and tier-gate @critical", () => {
  const localizedPath = (path: string) => new RegExp(`/([a-z]{2}/)?${path}`);
  const loginWithNext = (target: string) =>
    new RegExp(`/([a-z]{2}/)?(innlogging|login)\\?next=.*${target}`);
  const hasE2EAuthCredentials = Boolean(
    (process.env.E2E_USER_EMAIL || process.env.TEST_USER_EMAIL) &&
    (process.env.E2E_USER_PASSWORD || process.env.TEST_USER_PASSWORD),
  );
  const hasSupabaseAuthConfig = Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY),
  );
  const canBootstrapAuthState = hasE2EAuthCredentials && hasSupabaseAuthConfig;

  test("Landing: Handle/paper-trading CTA går til paper-trading eller innlogging", async ({
    page,
  }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });
    // Nav + hero bruker i18n (f.eks. navigation.navTrade = «Handel»), ikke fast «Lekepenger».
    // Stabil selektor: første synlige lenke til paper-trading (samme som MarketingNavigation).
    const paperLink = page.locator('a[href="/no/paper-trading"]').first();
    await expect(paperLink).toBeVisible({ timeout: 15000 });
    await paperLink.click();
    await expect(page).toHaveURL(
      /\/([a-z]{2}\/)?(paper-trading|innlogging|login|signup)/,
      {
        timeout: 15000,
      },
    );
  });

  test("Paper-trading side: ingen lenker til /live-trading/ eller /beta/", async ({
    page,
  }) => {
    await page.goto("/no/paper-trading", { waitUntil: "domcontentloaded" });
    const links = await page.locator("a[href]").all();
    for (const link of links) {
      const href = await link.getAttribute("href");
      if (href) {
        expect(href).not.toMatch(/\/live-trading\/[^/]+/);
        expect(href).not.toMatch(/\/beta\/?/);
      }
    }
  });

  test("/beta omdirigeres til dashboard", async ({ page }) => {
    await page.goto("/no/beta", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(
      /\/([a-z]{2}\/)?(dashboard|(innlogging|login)\?next=.*dashboard)/,
      {
        timeout: 10000,
      },
    );
  });

  test("/beta/live-trading omdirigeres til paper-trading?mode=live", async ({
    page,
  }) => {
    await page.goto("/no/beta/live-trading", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(
      /\/([a-z]{2}\/)?(paper-trading\?mode=live|(innlogging|login)\?next=.*paper-trading.*mode=live)/,
      {
        timeout: 10000,
      },
    );
  });

  test("Paper-trading med view=sessions: Mine sesjoner og Tilbake-lenker synlige", async ({
    page,
  }) => {
    test.skip(
      !canBootstrapAuthState,
      "Requires E2E credentials and Supabase auth config for authenticated sessions assertions",
    );

    await page.goto("/no/paper-trading?view=sessions", {
      waitUntil: "domcontentloaded",
    });
    const currentUrl = page.url();
    if (loginWithNext("paper-trading").test(currentUrl)) {
      console.log("⚠️ Redirected to login (expected without auth credentials)");
      test.skip();
    }

    await expect(page).toHaveURL(
      localizedPath("paper-trading\\?view=sessions"),
    );
    const backToOverview = page
      .getByRole("link", { name: /Tilbake til oversikt|Back to overview/i })
      .first();
    const backToDashboard = page
      .getByRole("link", { name: /Tilbake til dashboard|Back to dashboard/i })
      .first();
    const mySessions = page.getByText(/Mine sesjoner|My sessions/i).first();
    await expect(backToOverview.or(backToDashboard)).toBeVisible({
      timeout: 8000,
    });
    await expect(mySessions).toBeVisible({ timeout: 5000 });
  });
});
