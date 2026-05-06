/**
 * Visual Regression: Dashboard med trading-data
 *
 * Sammenligner dashboard-skjermbilder på tvers av enheter.
 * Krever innlogget E2E-bruker (storageState fra auth.setup.ts).
 */
import { test, expect, Page } from "@playwright/test";

const DASHBOARD_URL = "/no/dashboard";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

async function freezeDashboard(page: Page) {
  // Skjul dynamiske elementer som endres mellom kjøringer
  await page.addStyleTag({
    content: `
      [data-testid="live-price"],
      [data-testid="timestamp"],
      [data-testid="ticker"],
      [data-dynamic="true"],
      .animate-ticker-scroll,
      .animate-pulse,
      .animate-ping { visibility: hidden !important; }
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        transition-duration: 0.001ms !important;
      }
    `,
  });
}

async function skipOnboardingIfPresent(page: Page) {
  const skipButton = page.getByRole("button", {
    name: /Se dashbordet uten å sette opp/i,
  });
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
    await expect(skipButton).not.toBeVisible({ timeout: 5000 });
  }
}

for (const vp of VIEWPORTS) {
  test(`[visual] dashboard med trading-data — ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(DASHBOARD_URL, { waitUntil: "networkidle", timeout: 30_000 });

    // Håndter redirect til login
    if (page.url().includes("innlogging") || page.url().includes("login")) {
      test.skip(true, "Krever innlogget E2E-bruker — auth setup mangler");
      return;
    }

    await skipOnboardingIfPresent(page);

    // Vent på at dashboard-elementer laster
    await page.waitForSelector("main, [data-testid='dashboard']", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(2000); // Vent på hydration + data

    await freezeDashboard(page);

    await expect(page).toHaveScreenshot(`dashboard-trading-${vp.name}.png`, {
      maxDiffPixelRatio: 0.02,
      fullPage: vp.name === "desktop",
      animations: "disabled",
    });
  });
}

// ---- CSS Sanity: Dashboard skal ikke ha horizontal scroll ----

for (const vp of VIEWPORTS) {
  test(`[css] ingen horizontal scroll på dashboard — ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(DASHBOARD_URL, { waitUntil: "networkidle", timeout: 30_000 });

    if (page.url().includes("innlogging") || page.url().includes("login")) {
      test.skip(true, "Krever innlogget E2E-bruker");
      return;
    }

    await skipOnboardingIfPresent(page);
    await page.waitForTimeout(2000);

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasOverflow, `Horizontal scroll detected on ${vp.name}`).toBe(false);
  });
}
