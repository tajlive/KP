import { test, expect, type Page } from "@playwright/test";

/**
 * Mobil viewport — kritiske brukerreiser (småsparere, tommel-først).
 * Kjører under mobile-safari / mobile-chrome med storageState fra setup.
 * @mobile @critical
 */

async function skipIfSupabaseOrAuthUnavailable(page: Page) {
  await page.goto("/no/dashboard", { timeout: 60_000 });
  await page
    .waitForLoadState("domcontentloaded", { timeout: 30_000 })
    .catch(() => {});
  const body = (await page.locator("body").textContent()) ?? "";
  if (
    body.includes("Supabase er ikke konfigurert") ||
    body.includes("Konfigurasjonsfeil")
  ) {
    test.skip();
  }
  const url = page.url();
  if (url.includes("innlogging") || url.includes("/login")) {
    test.skip();
  }
}

test.describe("Mobile: critical journey @mobile @critical", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("landing loads without horizontal overflow", async ({ page }) => {
    await page.goto("/", { timeout: 60_000 });
    await page
      .waitForLoadState("domcontentloaded", { timeout: 30_000 })
      .catch(() => {});
    const body = (await page.locator("body").textContent()) ?? "";
    if (
      body.includes("Supabase er ikke konfigurert") ||
      body.includes("Konfigurasjonsfeil")
    ) {
      test.skip();
    }
    const vw = await page.evaluate(() => window.innerWidth);
    const bodyScroll = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScroll).toBeLessThanOrEqual(vw + 1);
  });

  test("authenticated: guest auth routes redirect on mobile", async ({
    page,
  }) => {
    await skipIfSupabaseOrAuthUnavailable(page);

    await page.goto("/no/signup", { timeout: 60_000 });
    await page.waitForURL((url) => !url.pathname.includes("/signup"), {
      timeout: 25_000,
    });

    await page.goto("/no/innlogging", { timeout: 60_000 });
    await page.waitForURL((url) => !url.pathname.includes("innlogging"), {
      timeout: 25_000,
    });
  });

  test("priser page renders on mobile viewport", async ({ page }) => {
    await page.goto("/no/priser", { timeout: 60_000 });
    await page
      .waitForLoadState("domcontentloaded", { timeout: 30_000 })
      .catch(() => {});
    const body = (await page.locator("body").textContent()) ?? "";
    if (
      body.includes("Supabase er ikke konfigurert") ||
      body.includes("Konfigurasjonsfeil")
    ) {
      test.skip();
    }
    await expect(page.locator("body")).toBeVisible();
    expect(body.length).toBeGreaterThan(50);
  });
});
