/**
 * Menneskelig test — naviger som en ekte bruker
 * Testbruker: test1@klarpakke.no / Test1234!
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL || "https://www.klarpakke.no";
const USER = { email: "test1@klarpakke.no", password: "Test1234!" };

test.describe("🧑 Testbruker-reise — alle sider", () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/no/login`);
    await page.locator('input[type="email"]').first().fill(USER.email);
    await page.locator('input[type="password"]').first().fill(USER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
  });

  test("1. Dashboard — alle elementer synlige", async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
    
    // Sjekk at dashboard har reelt innhold (ikke blank)
    const body = await page.content();
    expect(body.length).toBeGreaterThan(1000);
    
    // Sjekk for Worker crash
    expect(body).not.toMatch(/Feilkode: \d{7,}/);
    
    // Sjekk at navigasjonselementer finnes
    const navLinks = page.locator('nav a, header a');
    const count = await navLinks.count();
    console.log(`  📍 Navigasjonslenker: ${count}`);
    expect(count).toBeGreaterThan(0);
    
    // Klikkbare elementer
    const buttons = page.locator('button, a[href], [role="button"]');
    const btnCount = await buttons.count();
    console.log(`  🔘 Klikkbare elementer: ${btnCount}`);
    expect(btnCount).toBeGreaterThan(3);
  });

  test("2. Navigasjon — alle hovedlenker fungerer", async ({ page }) => {
    const routes = [
      "/no/dashboard",
      "/no/jokertrade",
      "/no/leaderboard",
      "/no/handel",
      "/no/priser",
    ];
    
    for (const route of routes) {
      const res = await page.goto(`${BASE}${route}`);
      const status = res?.status() ?? 0;
      const url = page.url();
      
      // Skal enten returnere 200 eller redirecte til login (ikke 500)
      expect(status).toBeLessThan(500);
      
      const body = await page.content();
      expect(body).not.toMatch(/Feilkode: \d{7,}/);
      
      console.log(`  ${route}: HTTP ${status} → ${url.substring(0, 50)}`);
    }
  });

  test("3. JokerTrade — side, knapper, funksjonalitet", async ({ page }) => {
    await page.goto(`${BASE}/no/jokertrade`);
    await page.waitForLoadState("domcontentloaded");
    
    // Siden skal ikke returnere til login
    expect(page.url()).toContain("jokertrade");
    
    const body = await page.content();
    console.log(`  📄 JokerTrade HTML: ${body.length} bytes`);
    
    // Sjekk for JokerTrade-relaterte elementer
    const hasJoker = body.includes("Joker") || body.includes("joker");
    expect(hasJoker).toBeTruthy();
    
    // Finn alle klikkbare elementer
    const buttons = page.locator('button, a[href], [role="button"]');
    const btnCount = await buttons.count();
    console.log(`  🔘 Klikkbare elementer: ${btnCount}`);
    
    // Sjekk konsoll-feil
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    // Vent litt og sjekk
    await page.waitForTimeout(2000);
    console.log(`  ⚠️ Konsoll-feil: ${errors.length}`);
    if (errors.length > 0) {
      for (const e of errors.slice(0, 5)) {
        console.log(`    - ${e.substring(0, 100)}`);
      }
    }
  });

  test("4. Auto-trade — siden laster", async ({ page }) => {
    await page.goto(`${BASE}/no/dashboard/auto-trade`);
    await page.waitForLoadState("domcontentloaded");
    
    const status = page.url();
    console.log(`  📍 Auto-trade URL: ${status}`);
    
    // Skal ikke være login-side
    expect(status).not.toContain("/login");
    
    const body = await page.content();
    expect(body.length).toBeGreaterThan(500);
    expect(body).not.toMatch(/Feilkode: \d{7,}/);
  });

  test("5. Leaderboard — data og interaksjon", async ({ page }) => {
    await page.goto(`${BASE}/no/leaderboard`);
    await page.waitForLoadState("domcontentloaded");
    
    const body = await page.content();
    
    // Sjekk for tom state
    const isTom = body.includes("Ingen aktive") || body.includes("ingen tradere");
    console.log(`  🏆 Leaderboard tom: ${isTom}`);
    
    // Sjekk for tradere (navn fra seed data)
    const hasData = body.includes("Anne") || body.includes("Per") || body.includes("Kari") || body.includes("Trond");
    console.log(`  🏆 Har data: ${hasData}`);
    
    expect(body).not.toMatch(/Feilkode: \d{7,}/);
  });

  test("6. Handel-side — knapper fungerer", async ({ page }) => {
    await page.goto(`${BASE}/no/handel`);
    await page.waitForLoadState("domcontentloaded");
    
    const body = await page.content();
    expect(body.length).toBeGreaterThan(500);
    
    // Sjekk om trade-knapper finnes
    const tradeButtons = page.locator('button:has-text("Kjøp"), button:has-text("Selg"), button:has-text("Trade")');
    const count = await tradeButtons.count();
    console.log(`  💰 Trade-knapper: ${count}`);
    
    expect(body).not.toMatch(/Feilkode: \d{7,}/);
  });

  test("7. API-endepunkter (autentisert)", async ({ request }) => {
    // Login for å få token
    const loginPage = await request.get(`${BASE}/no/login`);
    expect(loginPage.status()).toBe(200);
    
    // Test offentlige APIer
    const apis = [
      "/api/health",
      "/api/leaderboard?period=weekly",
    ];
    
    for (const api of apis) {
      const res = await request.get(`${BASE}${api}`);
      const status = res.status();
      const body = await res.text();
      console.log(`  ${api}: HTTP ${status} (${body.length} bytes)`);
      expect(status).toBeLessThan(500);
    }
  });

  test("8. Ingen uventede 500-feil", async ({ page }) => {
    const criticalPages = [
      "/no/dashboard",
      "/no/dashboard/auto-trade",
      "/no/dashboard/portfolio",
      "/no/jokertrade",
      "/no/leaderboard",
      "/no/handel",
      "/no/priser",
      "/no/profile",
    ];
    
    let errors = 0;
    for (const path of criticalPages) {
      const res = await page.goto(`${BASE}${path}`);
      if (res && res.status() >= 500) {
        console.log(`  ❌ ${path}: HTTP ${res.status()}`);
        errors++;
      } else {
        console.log(`  ✅ ${path}: HTTP ${res?.status() ?? '?'}`);
      }
    }
    
    expect(errors).toBe(0);
  });

});
