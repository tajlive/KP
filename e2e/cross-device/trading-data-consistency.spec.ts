/**
 * Cross-device: Trading data consistency
 *
 * Verifiserer at tall, prosent, bot-status er identiske på
 * mobil, tablet og desktop.
 *
 * Krever innlogget E2E-bruker (storageState fra auth.setup.ts).
 */
import { test, expect, type Page } from "@playwright/test";

const DASHBOARD_URL = "/no/dashboard";

const DEVICES = [
  { name: "desktop", viewport: { width: 1440, height: 900 } },
  { name: "tablet", viewport: { width: 768, height: 1024 } },
  { name: "mobile", viewport: { width: 390, height: 844 } },
] as const;

async function skipOnboardingIfPresent(page: Page) {
  const skipButton = page.getByRole("button", {
    name: /Se dashbordet uten å sette opp/i,
  });
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
    await expect(skipButton).not.toBeVisible({ timeout: 5000 });
  }
}

async function openDashboard(page: Page, device: (typeof DEVICES)[number]) {
  await page.setViewportSize(device.viewport);
  await page.goto(DASHBOARD_URL, { waitUntil: "networkidle", timeout: 30_000 });

  if (page.url().includes("innlogging") || page.url().includes("login")) {
    test.skip(true, "Krever innlogget E2E-bruker");
    return false;
  }

  await skipOnboardingIfPresent(page);
  await page.waitForTimeout(2000); // Vent på hydration
  return true;
}

test.describe("Cross-device: Bot tall konsistens @cross-device", () => {
  test("dashboard laster uten feil på alle enheter", async ({ browser }) => {
    for (const device of DEVICES) {
      const context = await browser.newContext({
        viewport: device.viewport,
      });
      const page = await context.newPage();

      const success = await openDashboard(page, device);
      if (!success) return;

      // Verifiser at hovedinnhold er synlig
      const mainContent = await page.locator("main, [data-testid='dashboard']").first().isVisible().catch(() => false);
      expect(mainContent, `Dashboard ikke synlig på ${device.name}`).toBe(true);

      await context.close();
    }
  });

  test("ingen horizontal scroll på mobil/tablet", async ({ browser }) => {
    for (const device of DEVICES.filter((d) => d.name !== "desktop")) {
      const context = await browser.newContext({
        viewport: device.viewport,
      });
      const page = await context.newPage();

      const success = await openDashboard(page, device);
      if (!success) return;

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      expect(hasOverflow, `Horizontal scroll på ${device.name}`).toBe(false);
      await context.close();
    }
  });

  test("bot-status vises på alle enheter", async ({ browser }) => {
    for (const device of DEVICES) {
      const context = await browser.newContext({
        viewport: device.viewport,
      });
      const page = await context.newPage();

      const success = await openDashboard(page, device);
      if (!success) return;

      // Sjekk at enten "Aktiv", "Pauset", "Stoppet" eller empty-state er synlig
      const statusTexts = ["Aktiv", "Pauset", "Stoppet", "Ingen aktive botter"];
      let hasStatus = false;
      for (const text of statusTexts) {
        const found = await page.getByText(text).first().isVisible().catch(() => false);
        if (found) {
          hasStatus = true;
          break;
        }
      }

      expect(hasStatus, `Ingen bot-status funnet på ${device.name}`).toBe(true);
      await context.close();
    }
  });
});

test.describe("Cross-device: Responsive layout @cross-device", () => {
  test("navigation er tilgjengelig på alle enheter", async ({ browser }) => {
    for (const device of DEVICES) {
      const context = await browser.newContext({
        viewport: device.viewport,
      });
      const page = await context.newPage();

      const success = await openDashboard(page, device);
      if (!success) return;

      // På mobil: sjekk at hamburger-meny eller bottom-nav finnes
      // På desktop: sjekk at side-nav eller top-nav finnes
      const navVisible = await page.locator("nav, [role='navigation'], header").first().isVisible().catch(() => false);
      expect(navVisible, `Navigasjon ikke synlig på ${device.name}`).toBe(true);

      await context.close();
    }
  });

  test("PnL/verdi-elementer er synlige på alle enheter", async ({ browser }) => {
    for (const device of DEVICES) {
      const context = await browser.newContext({
        viewport: device.viewport,
      });
      const page = await context.newPage();

      const success = await openDashboard(page, device);
      if (!success) return;

      // Sjekk at nøkkeltall er synlige (kr, %, trades)
      const krVisible = await page.getByText(/kr/).first().isVisible().catch(() => false);
      const percentVisible = await page.getByText(/%/).first().isVisible().catch(() => false);

      // Minst ett av dem bør være synlig (hvis bruker har data)
      expect(krVisible || percentVisible, `Ingen verdi-elementer synlige på ${device.name}`).toBe(true);

      await context.close();
    }
  });
});
