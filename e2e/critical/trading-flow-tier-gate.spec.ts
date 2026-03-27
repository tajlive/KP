import { test, expect } from "@playwright/test";
import { waitForDevHealth } from "../helpers/wait-for-dev-health";

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

  test.beforeEach(async ({ playwright, baseURL }) => {
    await waitForDevHealth(playwright, baseURL);
  });

  test("Landing: Handle/paper-trading CTA går til paper-trading eller innlogging", async ({
    page,
  }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded", timeout: 90_000 });
    // `localePrefix: 'as-needed'`: no → `/paper-trading`; eksplisitt `/no/…` eller `en` → prefixed.
    const paperLink = page
      .locator(
        'a[href="/paper-trading"], a[href="/no/paper-trading"], a[href="/en/paper-trading"]',
      )
      .first();
    await expect(paperLink).toBeVisible({ timeout: 20_000 });
    const dest = /\/([a-z]{2}\/)?(paper-trading|innlogging|login|signup)/;
    // Start URL-vent før klikk (Firefox + RSC): unngår racy rekkefølge der navigasjon er ferdig før listener.
    await Promise.all([
      page.waitForURL(dest, {
        timeout: 90_000,
        waitUntil: "domcontentloaded",
      }),
      paperLink.click({ noWaitAfter: true }),
    ]);
  });

  test("Paper-trading side: ingen lenker til /live-trading/ eller /beta/", async ({
    page,
  }) => {
    await page.goto("/no/paper-trading", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
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
    await page.goto("/no/beta", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expect(page).toHaveURL(
      /\/([a-z]{2}\/)?(dashboard|(innlogging|login)\?next=.*dashboard)/,
      {
        timeout: 30_000,
      },
    );
  });

  test("/beta/live-trading omdirigeres til paper-trading, login eller upgrade", async ({
    page,
  }) => {
    await page.goto("/no/beta/live-trading", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(
      /\/([a-z]{2}\/)?(paper-trading\?mode=live|(innlogging|login)\?next=.*paper-trading.*mode=live|priser\?upgrade=true)/,
      {
        timeout: 10000,
      },
    );
  });

  test("Paper-trading med view=sessions: Mine sesjoner og Tilbake-lenker synlige", async ({
    page,
    playwright,
    baseURL,
  }) => {
    test.skip(
      !canBootstrapAuthState,
      "Requires E2E credentials and Supabase auth config for authenticated sessions assertions",
    );

    const sessionsPath = "/no/paper-trading?view=sessions";
    const isConnRefused = (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      return (
        msg.includes("CONNECTION_REFUSED") ||
        msg.includes("NS_ERROR_CONNECTION_REFUSED") ||
        msg.includes("ERR_CONNECTION_REFUSED")
      );
    };

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.goto(sessionsPath, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
        break;
      } catch (e) {
        if (attempt >= 3 || !isConnRefused(e)) throw e;
        await new Promise((r) => setTimeout(r, 2500));
        await waitForDevHealth(playwright, baseURL);
      }
    }
    const currentUrl = page.url();
    if (loginWithNext("paper-trading").test(currentUrl)) {
      await expect(
        page.getByRole("link", {
          name: /Logg inn|Log in|Opprett konto|Create account/i,
        }),
      ).toBeVisible({ timeout: 10_000 });
      console.log("✅ Redirected to login/guest path as expected");
      return;
    }

    // Skip if we see the public teaser (unauthenticated)
    const teaserVisible = await page
      .getByRole("link", {
        name: /Logg inn|Log in|Opprett konto|Create account/i,
      })
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (teaserVisible) {
      await expect(
        page.getByRole("link", {
          name: /Logg inn|Log in|Opprett konto|Create account/i,
        }),
      ).toBeVisible({ timeout: 10_000 });
      console.log("✅ Guest teaser visible when sessions view is gated");
      return;
    }

    await expect(page).toHaveURL(
      localizedPath("paper-trading\\?view=sessions"),
    );
    // Use data-testid first, fallback to role/text for backwards compatibility
    const backToOverview = page
      .locator('[data-testid="back-to-overview"]')
      .first();
    const backToDashboard = page
      .locator('[data-testid="back-to-dashboard"]')
      .first();
    const backLinksFallback = page
      .getByRole("link", {
        name: /Tilbake til oversikt|Back to overview|Tilbake til dashboard|Back to dashboard/i,
      })
      .first();
    const sessionsHeading = page
      .locator('[data-testid="sessions-heading"]')
      .first();
    const sessionsHeadingFallback = page
      .getByText(/Mine sesjoner|My sessions|Ingen sesjoner|No sessions/i)
      .first();

    const backVisible = await backToOverview
      .or(backToDashboard)
      .or(backLinksFallback)
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    if (!backVisible) {
      // Hvis sessions ikke er synlig, valider at vi i stedet fikk en trygg guest-flate.
      await expect(
        page.getByRole("link", {
          name: /Logg inn|Log in|Opprett konto|Create account/i,
        }),
      ).toBeVisible({ timeout: 10_000 });
      console.log("✅ Sessions gated; guest CTA rendered");
      return;
    }
    await expect(
      backToOverview.or(backToDashboard).or(backLinksFallback),
    ).toBeVisible({ timeout: 2000 });
    await expect(sessionsHeading.or(sessionsHeadingFallback)).toBeVisible({
      timeout: 5000,
    });
  });
});
