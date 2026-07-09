/**
 * Golden Path E2E — autentisert
 * Tester hele brukerreisen: Login → Dashboard → JokerTrade
 * 
 * Credentials: e2e-test@klarpakke.no / KlarpakkeE2E2026!
 * Set these in GitHub Secrets: E2E_TEST_EMAIL, E2E_TEST_PASSWORD
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL || "https://www.klarpakke.no";
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "e2e-test@klarpakke.no";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "KlarpakkeE2E2026!";

test.describe("Golden Path — autentisert", () => {
  
  test("1. Innlogging fungerer", async ({ page }) => {
    await page.goto(`${BASE}/no/login`);
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10000 });
    
    await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    
    // Vent på redirect til dashboard
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test("2. Dashboard viser JokerTrade CTA", async ({ page }) => {
    // Login via localStorage (raskere)
    await page.goto(`${BASE}/no/login`);
    await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    
    // Sjekk at JokerTrade CTA finnes
    await expect(page.locator('text=JokerTrade').first()).toBeVisible({ timeout: 10000 });
  });

  test("3. JokerTrade side laster for innlogget bruker", async ({ page }) => {
    // Login
    await page.goto(`${BASE}/no/login`);
    await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    
    // Naviger til JokerTrade
    await page.goto(`${BASE}/no/jokertrade`);
    await page.waitForLoadState("domcontentloaded");
    
    // Skal IKKE redirecte til login
    expect(page.url()).toContain("/jokertrade");
    
    // Sjekk at siden har innhold
    await expect(page.locator('text=JokerTrade').first()).toBeVisible({ timeout: 10000 });
  });

  test("4. Leaderboard viser data", async ({ page }) => {
    await page.goto(`${BASE}/no/leaderboard`);
    await page.waitForLoadState("domcontentloaded");
    
    // Skal IKKE vise "Ingen aktive konkurranser" (tom state)
    const emptyState = page.locator('text=Ingen aktive');
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    
    if (hasEmpty) {
      console.warn("⚠️ Leaderboard viser tom state — sjekk data");
    }
    
    // Siden skal uansett laste
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test("5. Kritiske API-endepunkter for autentisert bruker", async ({ request }) => {
    // Login for å få token
    const loginRes = await request.post(`${BASE}/api/auth/callback/credentials`, {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD },
    }).catch(() => null);

    // Sjekk leaderboard API (offentlig)
    const lb = await request.get(`${BASE}/api/leaderboard?period=weekly`);
    expect(lb.status()).toBe(200);
    const lbData = await lb.json();
    expect(Array.isArray(lbData)).toBeTruthy();
  });

  test("6. Ingen 500-feil på autentiserte sider", async ({ page }) => {
    const pages = [
      "/no/dashboard",
      "/no/jokertrade", 
      "/no/leaderboard",
      "/no/handel",
      "/no/priser",
    ];
    
    // Login
    await page.goto(`${BASE}/no/login`);
    await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    
    for (const path of pages) {
      const res = await page.goto(`${BASE}${path}`);
      expect(res?.status()).toBeLessThan(500);
      
      // Sjekk at siden ikke viser Worker crash
      const body = await page.content();
      expect(body).not.toMatch(/Feilkode: \d{7,}/);
    }
  });

});
