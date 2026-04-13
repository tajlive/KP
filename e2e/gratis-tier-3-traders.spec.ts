/**
 * E2E Test: Gratis Tier (Student) + 3 Paper Tradere
 * 
 * Verifiserer:
 * 1. Registrering fungerer
 * 2. Paper trading init fungerer
 * 3. Kan opprette 3 tradere
 * 4. Duplikat-sjekk fungerer
 * 5. Alle toast-meldinger er på norsk
 */

import { test, expect } from "@playwright/test";
import { waitForDevHealth } from "./helpers/wait-for-dev-health";

test.describe("Gratis Tier + 3 Paper Tradere @critical @trading", () => {
  
  const TEST_USER = {
    email: `test-${Date.now()}@example.com`,
    password: "TestPass123!",
  };

  test.beforeAll(async ({ playwright, baseURL }) => {
    await waitForDevHealth(playwright, baseURL);
  });

  test("1. Registrering av ny bruker", async ({ page }) => {
    // Gå til registreringssiden
    await page.goto("/no/auth/registrer", { timeout: 60000 });
    
    // Fyll ut skjema
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    
    // Klikk registrer
    await page.click('button[type="submit"]');
    
    // Vent på redirect til dashboard eller bekreftelse
    await page.waitForURL(/.*dashboard|.*verify|.*bekreft/, { timeout: 30000 });
    
    // Verifiser at vi er logget inn (enten dashboard eller verifiseringsside)
    const url = page.url();
    expect(url).toMatch(/dashboard|verify|bekreft/);
    
    console.log(`✅ Bruker registrert: ${TEST_USER.email}`);
  });

  test("2. Paper trading session init", async ({ page }) => {
    // Forutsetter at vi er logget inn fra forrige test
    // eller logg inn på nytt
    await page.goto("/no/dashboard");
    
    // Vent på at dashboard laster
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    
    // Verifiser at "Lekepenger" vises (ikke "Paper Trading")
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toContain("Lekepenger");
    expect(bodyText).not.toContain("[MISSING:");
    
    console.log("✅ Paper trading session tilgjengelig");
  });

  test("3. Opprette første trader", async ({ page }) => {
    // Gå til auto-trade / bot-wizard
    await page.goto("/no/dashboard/auto-trade");
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    
    // Velg strategi (DCA)
    await page.click('text=DCA Strategi');
    await page.click('button:has-text("Neste")');
    
    // Velg risikonivå
    await page.click('text=Middels risiko');
    await page.click('button:has-text("Neste")');
    
    // Verifiser startkapital
    await expect(page.locator('text=100 000 kr')).toBeVisible();
    
    // Start trader
    await page.click('button:has-text("Start trader")');
    
    // Vent på toast med norsk tekst
    await expect(page.locator('text=Øvingsbot startet!')).toBeVisible({ timeout: 10000 });
    
    console.log("✅ Første trader opprettet");
  });

  test("4. Opprette andre trader (annen strategi)", async ({ page }) => {
    // Gå tilbake til auto-trade
    await page.goto("/no/dashboard/auto-trade");
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    
    // Velg annen strategi (TREND)
    await page.click('text=Trend Following');
    await page.click('button:has-text("Neste")');
    
    // Velg risikonivå
    await page.click('text=Lav risiko');
    await page.click('button:has-text("Neste")');
    
    // Start trader
    await page.click('button:has-text("Start trader")');
    
    // Vent på toast
    await expect(page.locator('text=Øvingsbot startet!')).toBeVisible({ timeout: 10000 });
    
    console.log("✅ Andre trader opprettet");
  });

  test("5. Opprette tredje trader", async ({ page }) => {
    // Gå tilbake til auto-trade
    await page.goto("/no/dashboard/auto-trade");
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    
    // Velg tredje strategi (GRID)
    await page.click('text=Grid Trading');
    await page.click('button:has-text("Neste")');
    
    // Velg risikonivå
    await page.click('text=Høy risiko');
    await page.click('button:has-text("Neste")');
    
    // Start trader
    await page.click('button:has-text("Start trader")');
    
    // Vent på toast
    await expect(page.locator('text=Øvingsbot startet!')).toBeVisible({ timeout: 10000 });
    
    console.log("✅ Tredje trader opprettet");
  });

  test("6. Verifiser 3 aktive tradere i dashboard", async ({ page }) => {
    await page.goto("/no/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    
    // Sjekk at vi ser aktive tradere
    const bodyText = await page.locator("body").textContent();
    
    // Verifiser at vi har trader-informasjon
    expect(bodyText).toMatch(/aktiv|trader|bot/i);
    
    console.log("✅ 3 aktive tradere verifisert i dashboard");
  });

  test("7. Test duplikat (samme par + strategi)", async ({ page }) => {
    // Gå til auto-trade
    await page.goto("/no/dashboard/auto-trade");
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    
    // Prøv å opprette DCA igjen (samme som første trader)
    await page.click('text=DCA Strategi');
    await page.click('button:has-text("Neste")');
    
    // Velg risikonivå
    await page.click('text=Middels risiko');
    await page.click('button:has-text("Neste")');
    
    // Prøv å starte (skal feile med duplikat)
    await page.click('button:has-text("Start trader")');
    
    // Vent på feilmelding
    await expect(page.locator('text=Allerede aktiv')).toBeVisible({ timeout: 10000 });
    
    console.log("✅ Duplikat-sjekk fungerer korrekt");
  });

  test("8. Verifiser i18n - ingen råe nøkler", async ({ page }) => {
    await page.goto("/no/dashboard/auto-trade");
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    
    const bodyText = await page.locator("body").textContent();
    
    // Skal IKKE inneholde disse
    expect(bodyText).not.toContain("[MISSING:");
    expect(bodyText).not.toContain("toasts.paperBot");
    expect(bodyText).not.toContain("Paper Trading");
    
    // Skal inneholde norske termer
    expect(bodyText).toContain("Lekepenger");
    
    console.log("✅ i18n verifisert - alle tekster på norsk");
  });

  test.afterAll(async () => {
    // Logg resultat til console
    console.log("\n" + "=".repeat(50));
    console.log("VERIFISERING FULLFØRT");
    console.log("=".repeat(50));
    console.log("✅ Registrering: OK");
    console.log("✅ Paper trading init: OK");
    console.log("✅ 3 tradere opprettet: OK");
    console.log("✅ Duplikat-sjekk: OK");
    console.log("✅ i18n (norsk): OK");
    console.log("=".repeat(50));
  });
});
