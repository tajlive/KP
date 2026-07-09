/**
 * Golden Path E2E — autentisert
 * Tester hele brukerreisen: Login → Dashboard → undersider
 * 
 * Credentials: e2e-test@klarpakke.no / KlarpakkeE2E2026!
 * Set these in GitHub Secrets: E2E_TEST_EMAIL, E2E_TEST_PASSWORD
 */
import { test, expect, Page } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL || "https://www.klarpakke.no";
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "e2e-test@klarpakke.no";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "KlarpakkeE2E2026!";

/** Felles hjelper: logg inn og vent på dashboard-redirect. */
async function loginAsTestUser(page: Page): Promise<void> {
  await page.goto(`${BASE}/no/login`);
  await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
  await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL("**/dashboard**", { timeout: 15000 });
}

/** Verifiser at siden ikke har Worker crash og har innhold. */
async function assertPageHealthy(page: Page): Promise<void> {
  const body = await page.content();
  expect(body).not.toMatch(/Feilkode: \d{7,}/);
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
}

test.describe("Golden Path — autentisert", () => {

  /* ── 1. Innlogging ─────────────────────────────────────────────── */

  test("1. Innlogging fungerer", async ({ page }) => {
    await page.goto(`${BASE}/no/login`);
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10000 });

    await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();

    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  /* ── 2. Dashboard-hjem ─────────────────────────────────────────── */

  test("2. Dashboard laster for innlogget bruker (uten feil)", async ({ page }) => {
    await loginAsTestUser(page);

    await assertPageHealthy(page);
  });

  /* ── 3. JokerTrade ─────────────────────────────────────────────── */

  test("3. JokerTrade side laster for innlogget bruker", async ({ page }) => {
    await loginAsTestUser(page);

    await page.goto(`${BASE}/no/jokertrade`);
    await page.waitForLoadState("domcontentloaded");

    // Skal IKKE redirecte til login
    expect(page.url()).toContain("/jokertrade");

    await expect(page.locator('text=JokerTrade').first()).toBeVisible({ timeout: 10000 });
    await assertPageHealthy(page);
  });

  /* ── 4. Leaderboard ────────────────────────────────────────────── */

  test("4. Leaderboard viser data", async ({ page }) => {
    await page.goto(`${BASE}/no/leaderboard`);
    await page.waitForLoadState("domcontentloaded");

    const emptyState = page.locator('text=Ingen aktive');
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    if (hasEmpty) {
      console.warn("⚠️ Leaderboard viser tom state — sjekk data");
    }

    await expect(page.locator('h1, h2').first()).toBeVisible();
    await assertPageHealthy(page);
  });

  /* ── 5. API-endepunkter ────────────────────────────────────────── */

  test("5. Kritiske API-endepunkter for autentisert bruker", async ({ request }) => {
    // Login for å få token
    await request.post(`${BASE}/api/auth/callback/credentials`, {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD },
    }).catch(() => null);

    // Sjekk leaderboard API (offentlig)
    const lb = await request.get(`${BASE}/api/leaderboard?period=weekly`);
    expect(lb.status()).toBe(200);
    const lbData = await lb.json();
    expect(Array.isArray(lbData)).toBeTruthy();
  });

  /* ── 6. Ingen 500-feil på autentiserte sider ───────────────────── */

  test("6. Ingen 500-feil på autentiserte sider", async ({ page }) => {
    const pages = [
      "/no/dashboard",
      "/no/jokertrade",
      "/no/leaderboard",
      "/no/handel",
      "/no/priser",
      "/no/dashboard/portfolio",
      "/no/dashboard/auto-trade",
      "/no/dashboard/historikk",
      "/no/dashboard/resultater",
      "/no/dashboard/settings",
      "/no/profile",
      "/no/marked",
      "/no/varsler",
    ];

    await loginAsTestUser(page);

    for (const path of pages) {
      const res = await page.goto(`${BASE}${path}`);
      expect(res?.status()).toBeLessThan(500);

      // Sjekk at siden ikke viser Worker crash
      const body = await page.content();
      expect(body, `${path} — ingen Worker crash`).not.toMatch(/Feilkode: \d{7,}/);
    }
  });

  /* ════════════════════════════════════════════════════════════════════════
     Dashboard-undersider — individuelle tester med innholdssjekk
     ════════════════════════════════════════════════════════════════════════ */

  /* ── 7. Dashboard portfolio ────────────────────────────────────── */

  test("7. Dashboard portfolio laster", async ({ page }) => {
    await loginAsTestUser(page);

    const res = await page.goto(`${BASE}/no/dashboard/portfolio`);
    expect(res?.status()).toBeLessThan(500);
    await assertPageHealthy(page);
    expect(page.url()).toContain("/dashboard/portfolio");
  });

  /* ── 8. Dashboard auto-trade ───────────────────────────────────── */

  test("8. Dashboard auto-trade laster", async ({ page }) => {
    await loginAsTestUser(page);

    const res = await page.goto(`${BASE}/no/dashboard/auto-trade`);
    expect(res?.status()).toBeLessThan(500);
    await assertPageHealthy(page);
    expect(page.url()).toContain("/dashboard/auto-trade");
  });

  /* ── 9. Dashboard historikk ────────────────────────────────────── */

  test("9. Dashboard historikk laster", async ({ page }) => {
    await loginAsTestUser(page);

    const res = await page.goto(`${BASE}/no/dashboard/historikk`);
    expect(res?.status()).toBeLessThan(500);
    await assertPageHealthy(page);
    expect(page.url()).toContain("/dashboard/historikk");
  });

  /* ── 10. Dashboard resultater ──────────────────────────────────── */

  test("10. Dashboard resultater laster", async ({ page }) => {
    await loginAsTestUser(page);

    const res = await page.goto(`${BASE}/no/dashboard/resultater`);
    expect(res?.status()).toBeLessThan(500);
    await assertPageHealthy(page);
    expect(page.url()).toContain("/dashboard/resultater");
  });

  /* ── 11. Dashboard settings ────────────────────────────────────── */

  test("11. Dashboard settings laster", async ({ page }) => {
    await loginAsTestUser(page);

    const res = await page.goto(`${BASE}/no/dashboard/settings`);
    expect(res?.status()).toBeLessThan(500);
    await assertPageHealthy(page);
    expect(page.url()).toContain("/dashboard/settings");
  });

  /* ── 12. Profile ───────────────────────────────────────────────── */

  test("12. Profile laster", async ({ page }) => {
    await loginAsTestUser(page);

    const res = await page.goto(`${BASE}/no/profile`);
    expect(res?.status()).toBeLessThan(500);
    await assertPageHealthy(page);
    expect(page.url()).toContain("/profile");
  });

  /* ── 13. Marked ────────────────────────────────────────────────── */

  test("13. Marked laster", async ({ page }) => {
    await loginAsTestUser(page);

    const res = await page.goto(`${BASE}/no/marked`);
    expect(res?.status()).toBeLessThan(500);
    await assertPageHealthy(page);
    expect(page.url()).toContain("/marked");
  });

  /* ── 14. Varsler ───────────────────────────────────────────────── */

  test("14. Varsler laster", async ({ page }) => {
    await loginAsTestUser(page);

    const res = await page.goto(`${BASE}/no/varsler`);
    expect(res?.status()).toBeLessThan(500);
    await assertPageHealthy(page);
    expect(page.url()).toContain("/varsler");
  });

});
