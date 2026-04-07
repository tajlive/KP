/**
 * E2E-tester for UX Modernisering Q2 2026
 * 
 * Tester:
 * - KLT-teaser på landing
 * - Leaderboard-preview
 * - Dashboard forenkling
 * - Profile-tabs
 * - Mikro-læring
 */

import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: process.env.E2E_USER_EMAIL || "tom@klarpakke.no",
  password: process.env.E2E_USER_PASSWORD || "test123456",
};

test.describe("UX Modernisering 2026", () => {
  
  test.beforeEach(async ({ page }) => {
    // Login før hver test
    await page.goto("/no/innlogging");
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 10000 });
  });

  test.describe("Landing page (ikke-innlogget)", () => {
    test("KLT-teaser vises på landing", async ({ page }) => {
      await page.goto("/no");
      
      const kltTeaser = page.locator("text=Tjen KLT gjennom kurs og konkurranser");
      await expect(kltTeaser).toBeVisible();
      
      const highlight = page.locator("text=50 000 KLT til månedens vinner");
      await expect(highlight).toBeVisible();
      
      // Sjekk at lenke fungerer
      await kltTeaser.click();
      await expect(page).toHaveURL(/.*kurs.*/);
    });

    test("Leaderboard-preview viser topp 3", async ({ page }) => {
      await page.goto("/no");
      
      const leaderboard = page.locator("text=Mest lønnsomme tradere");
      await expect(leaderboard).toBeVisible();
      
      // Sjekk at vi har 3 trader-rader
      const traders = page.locator('[data-testid="leaderboard-trader"]');
      await expect(traders).toHaveCount(3);
      
      // Sjekk CTA-knapper
      await expect(page.locator("text=Se full leaderboard")).toBeVisible();
      await expect(page.locator("text=Bli med")).toBeVisible();
    });

    test("Dynamisk brukertall vises", async ({ page }) => {
      await page.goto("/no");
      
      // Sjekk at stat-kort vises
      const userCount = page.locator("text=studenter lærer trading");
      await expect(userCount).toBeVisible();
      
      // Eller fallback-format
      const fallbackCount = page.locator("text=/\\d+k\\+?/");
      await expect(fallbackCount).toBeVisible();
    });
  });

  test.describe("Dashboard (innlogget)", () => {
    test("Dashboard viser forenklet førsteskjerm", async ({ page }) => {
      // Sjekk stor saldo
      const balance = page.locator("text=/\\d+\\s*NOK/").first();
      await expect(balance).toBeVisible();
      
      // Sjekk prosent-visning
      const changePct = page.locator("text=/%/").first();
      await expect(changePct).toBeVisible();
      
      // Sjekk primær CTA
      const cta = page.locator("text=Start trading");
      await expect(cta).toBeVisible();
      await expect(cta).toBeEnabled();
    });

    test("FirstTradePrompt vises for nye brukere", async ({ page }) => {
      // Clear localStorage for å simulere ny bruker
      await page.evaluate(() => localStorage.removeItem("kp_has_traded"));
      await page.reload();
      
      const prompt = page.locator("text=Gjør din første handel og få 100 KLT");
      await expect(prompt).toBeVisible();
      
      // Sjekk CTA
      const cta = page.locator("text=Prøv lekepenger");
      await expect(cta).toBeVisible();
      
      // Klikk skal navigere til paper-trading
      await cta.click();
      await expect(page).toHaveURL(/.*paper-trading.*/);
    });

    test("AdvancedSection kan ekspanderes", async ({ page }) => {
      const advancedBtn = page.locator("text=Avansert");
      await expect(advancedBtn).toBeVisible();
      
      // Klikk for å ekspandere
      await advancedBtn.click();
      
      // Sjekk at innhold vises
      await expect(page.locator("text=Portfolio").first()).toBeVisible();
    });

    test("Mikro-læring viser tips", async ({ page }) => {
      // Clear dismissed tips
      await page.evaluate(() => localStorage.removeItem("kp_onboarding_dismissed"));
      await page.reload();
      
      // Sjekk at tips vises
      const tip = page.locator("text=Start med lekepenger").first();
      await expect(tip).toBeVisible();
      
      // Sjekk dismiss-knapp
      const dismiss = page.locator('[aria-label="Lukk"]').first();
      await expect(dismiss).toBeVisible();
      
      // Dismiss skal skjule tip
      await dismiss.click();
      await expect(tip).not.toBeVisible();
    });
  });

  test.describe("Profile-tabs", () => {
    test("Profile-side har alle tabs", async ({ page }) => {
      await page.goto("/no/profile");
      
      // Sjekk alle tabs
      await expect(page.locator("text=Profil").first()).toBeVisible();
      await expect(page.locator("text=Lommebok").first()).toBeVisible();
      await expect(page.locator("text=Innstillinger").first()).toBeVisible();
    });

    test("Kan navigere mellom tabs", async ({ page }) => {
      await page.goto("/no/profile");
      
      // Klikk på Lommebok
      await page.click("text=Lommebok");
      await expect(page.locator("text=Børs-tilkobling").first()).toBeVisible();
      
      // Klikk på Innstillinger
      await page.click("text=Innstillinger");
      await expect(page.locator("text=E-post").first()).toBeVisible();
    });

    test("Redirect fra /konto til /profile/wallet", async ({ page }) => {
      await page.goto("/no/konto");
      await expect(page).toHaveURL(/.*profile.*/);
    });

    test("Redirect fra /innstillinger til /profile/settings", async ({ page }) => {
      await page.goto("/no/innstillinger");
      await expect(page).toHaveURL(/.*profile.*/);
    });
  });

  test.describe("Trading funksjonalitet", () => {
    test("Trading vises og fungerer", async ({ page }) => {
      // Naviger til trading
      await page.click("text=Trade");
      await page.waitForURL("**/dashboard/trade**");
      
      // Sjekk at trading-visning laster
      await expect(page.locator("text=Markeder").first()).toBeVisible();
      
      // Sjekk at vi kan se priser
      const prices = page.locator("text=/\\d+\.\d+/").first();
      await expect(prices).toBeVisible();
    });

    test("Paper-trading fungerer", async ({ page }) => {
      await page.goto("/no/dashboard/paper-trading");
      
      // Sjekk at paper-trading laster
      await expect(page.locator("text=Lekepenger").first()).toBeVisible();
      
      // Sjekk saldo
      const balance = page.locator("text=/100\\s*000/").first();
      await expect(balance).toBeVisible();
    });
  });
});
