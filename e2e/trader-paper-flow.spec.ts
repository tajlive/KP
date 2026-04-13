/**
 * E2E Tester for "Trader" + "Lekepenger" funksjonalitet
 * Tester alle kombinasjoner av trader-states
 */

import { test, expect } from "@playwright/test";

test.describe("Trader + Lekepenger Flow", () => {
  
  test.beforeEach(async ({ page }) => {
    // Logg inn med test-bruker
    await page.goto("/no/auth/logg-inn");
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || "test@example.com");
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || "testpass");
    await page.click('button[type="submit"');
    await page.waitForURL("**/dashboard**", { timeout: 10000 });
  });

  test.describe("Scenario 1: Første gang trader (ingen økter)", () => {
    test("viser 'Start øvingshandel' CTA", async ({ page }) => {
      await page.goto("/no/dashboard");
      
      // Sjekk at lekepenger-modus er aktiv
      await expect(page.locator('[data-testid="trading-mode-badge"]')).toContainText("Lekepenger");
      
      // Sjekk at CTA for å starte første trader vises
      await expect(page.locator('text=Start øvingshandel')).toBeVisible();
      await expect(page.locator('text=Ingen øvingshandler ennå')).toBeVisible();
    });

    test("kan opprette første trader via BotWizard", async ({ page }) => {
      await page.goto("/no/dashboard/auto-trade");
      
      // Velg strategi
      await page.click('text=DCA Strategi');
      await page.click('button:has-text("Neste")');
      
      // Velg risikonivå
      await page.click('text=Middels risiko');
      await page.click('button:has-text("Neste")');
      
      // Bekreft startkapital (100 000 kr lekepenger)
      await expect(page.locator('text=100 000 kr')).toBeVisible();
      await page.click('button:has-text("Start trader")');
      
      // Verifiser toast
      await expect(page.locator('text=Øvingsbot startet!')).toBeVisible();
      
      // Verifiser redirect til trader-siden
      await expect(page).toHaveURL(/.*\/dashboard\/bot\/.*/);
    });
  });

  test.describe("Scenario 2: Én aktiv trader", () => {
    test("viser trader-status i dashboard", async ({ page }) => {
      await page.goto("/no/dashboard");
      
      // Sjekk at aktiv trader vises
      await expect(page.locator('[data-testid="active-trader-card"]')).toBeVisible();
      await expect(page.locator('text=Aktiv trader')).toBeVisible();
      
      // Sjekk saldo-visning
      await expect(page.locator('text=kr 100 000')).toBeVisible();
    });

    test("kan stoppe eksisterende trader", async ({ page }) => {
      await page.goto("/no/dashboard/bot/");
      
      // Naviger til aktiv trader
      await page.click('[data-testid="stop-trader-button"]');
      
      // Bekreft i modal
      await page.click('text=Ja, stopp trader');
      
      // Verifiser toast
      await expect(page.locator('text=Trader stoppet')).toBeVisible();
    });
  });

  test.describe("Scenario 3: Maks antall tradere (grensetest)", () => {
    test("viser feilmelding ved for mange tradere", async ({ page }) => {
      // Prøv å opprette trader når grensen er nådd
      await page.goto("/no/dashboard/auto-trade");
      
      // Mock respons fra API for session limit
      await page.route("**/api/auto-trading/paper", async (route) => {
        await route.fulfill({
          status: 403,
          body: JSON.stringify({
            ok: false,
            code: "PAPER_BOT_SESSION_LIMIT",
            max_sessions: 3,
            message: "Maximum number of active paper bot sessions reached"
          })
        });
      });
      
      await page.click('text=Start trader');
      
      // Verifiser i18n feilmelding
      await expect(page.locator('text=Grense for antall tradere nådd')).toBeVisible();
      await expect(page.locator('text=Du kan ha maks 3 aktive tradere samtidig')).toBeVisible();
    });
  });

  test.describe("Scenario 4: Duplikat trader (samme par/strategi)", () => {
    test("viser feilmelding ved duplikat", async ({ page }) => {
      await page.goto("/no/dashboard/auto-trade");
      
      // Mock duplikat-respons
      await page.route("**/api/auto-trading/paper", async (route) => {
        await route.fulfill({
          status: 409,
          body: JSON.stringify({
            ok: false,
            code: "PAPER_BOT_DUPLICATE",
            message: "Du har allerede en aktiv sesjon for dette paret og strategien."
          })
        });
      });
      
      await page.click('text=Start trader');
      
      // Verifiser i18n feilmelding
      await expect(page.locator('text=Allerede aktiv')).toBeVisible();
      await expect(page.locator('text=Du har allerede en bot')).toBeVisible();
    });
  });

  test.describe("Scenario 5: Bytte mellom Lekepenger og Live", () => {
    test("toggler mellom modus i UnifiedTradingDashboard", async ({ page }) => {
      await page.goto("/no/dashboard/trade");
      
      // Sjekk initial modus (lekepenger)
      await expect(page.locator('[data-testid="mode-indicator"]')).toContainText("Lekepenger");
      
      // Bytt til Live (hvis Binance er koblet til)
      await page.click('[data-testid="mode-toggle"]');
      
      // Sjekk advarsel om ekte penger
      await expect(page.locator('text=Du handler med ekte midler')).toBeVisible();
      
      // Bytt tilbake til lekepenger
      await page.click('text=Bytt til lekepenger');
      
      // Verifiser tilbake til lekepenger
      await expect(page.locator('[data-testid="mode-indicator"]')).toContainText("Lekepenger");
    });
  });

  test.describe("Scenario 6: Trader-statistikk", () => {
    test("viser P&L for trader", async ({ page }) => {
      await page.goto("/no/dashboard");
      
      // Sjekk at trader-statistikk vises
      await expect(page.locator('text=Total P&L')).toBeVisible();
      await expect(page.locator('text=Win rate')).toBeVisible();
      
      // Sjekk at verdiene er formatert korrekt
      const pnlElement = page.locator('[data-testid="trader-pnl"]');
      await expect(pnlElement).toContainText(/kr [\d\s]+/);
    });
  });

  test.describe("i18n Verifisering", () => {
    test("alle 'trader'-tekster vises på norsk", async ({ page }) => {
      await page.goto("/no/dashboard/auto-trade");
      
      // Verifiser at vi ikke ser engelske "Paper" eller råe i18n-nøkler
      const pageContent = await page.content();
      
      // Skal IKKE inneholde disse (hvis i18n er riktig)
      expect(pageContent).not.toContain("Paper Trading");
      expect(pageContent).not.toContain("toasts.paperBot");
      expect(pageContent).not.toContain("[MISSING:");
      
      // Skal inneholde norske termer
      expect(pageContent).toContain("Lekepenger");
    });
  });
});
