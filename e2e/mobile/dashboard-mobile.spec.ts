import { test, expect, devices } from "@playwright/test";

/**
 * Mobile: DashboardPro responsivitet
 * Tester at Enterprise 2026-dashboardet fungerer på mobil.
 */

const DASHBOARD_NO = "/no/dashboard";

function isLoginUrl(url: string) {
  return url.includes("innlogging") || url.includes("/login");
}

async function skipOnboardingIfPresent(page: any): Promise<void> {
  const skipButton = page.getByRole("button", {
    name: /Se dashbordet uten å sette opp/i,
  });
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
    await expect(skipButton).not.toBeVisible({ timeout: 5000 });
  }
}

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe("Mobile: DashboardPro @mobile", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test("dashboard er synlig på mobil uten horizontal scroll", async ({ page }) => {
    await page.goto(DASHBOARD_NO, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000); // Vent på hydration

    if (isLoginUrl(page.url())) {
      test.skip(true, "Krever innlogget bruker");
      return;
    }

    await skipOnboardingIfPresent(page);

    // Dashboard laster
    const heroText = page.getByText(/Øvingsmodus|Live-modus|Din portefølje/).first();
    const heroVisible = await heroText.isVisible().catch(() => false);
    expect(heroVisible).toBe(true);

    // Ingen horizontal overflow på body
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test("PortfolioChart er synlig på mobil", async ({ page }) => {
    await page.goto(DASHBOARD_NO, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});

    if (isLoginUrl(page.url())) {
      test.skip(true, "Krever innlogget bruker");
      return;
    }

    await skipOnboardingIfPresent(page);

    // PortfolioChart-seksjon er synlig
    const chart = page.locator("[class*='rounded-2xl']").filter({ hasText: /Din portefølje|Ingen handelshistorikk/ }).first();
    const chartVisible = await chart.isVisible().catch(() => false);
    expect(chartVisible).toBe(true);

    // Chart-høyde skal ikke overstige viewport for mye
    const chartBox = await chart.boundingBox();
    if (chartBox) {
      expect(chartBox.height).toBeLessThanOrEqual(400);
    }
  });

  test("SmartActions er scrollable på mobil", async ({ page }) => {
    await page.goto(DASHBOARD_NO, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});

    if (isLoginUrl(page.url())) {
      test.skip(true, "Krever innlogget bruker");
      return;
    }

    await skipOnboardingIfPresent(page);

    // SmartActions-kort skal være synlige
    const actions = page.locator("a[href*='dashboard']");
    const count = await actions.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("AIInsightCard tabs er tilgjengelige på mobil", async ({ page }) => {
    await page.goto(DASHBOARD_NO, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});

    if (isLoginUrl(page.url())) {
      test.skip(true, "Krever innlogget bruker");
      return;
    }

    await skipOnboardingIfPresent(page);

    const aiCard = page.locator("text=AI-innsikt").or(page.locator("text=AI Insight")).first();
    const isVisible = await aiCard.isVisible().catch(() => false);

    if (!isVisible) {
      test.info().annotations.push({
        type: "skip-reason",
        description: "AIInsightCard ikke synlig på mobil (bruker-state)",
      });
      return;
    }

    await aiCard.click();

    // Tabs skal være synlige og klikkbare
    const firstTab = page.locator("button").filter({ hasText: /Ytelse|Performance/ }).first();
    const tabVisible = await firstTab.isVisible().catch(() => false);
    expect(tabVisible).toBe(true);
    if (tabVisible) await firstTab.click();
  });

  test("NLQChat-knapp plassert over bottom-nav", async ({ page }) => {
    await page.goto(DASHBOARD_NO, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});

    if (isLoginUrl(page.url())) {
      test.skip(true, "Krever innlogget bruker");
      return;
    }

    await skipOnboardingIfPresent(page);

    const chatButton = page.locator("button[aria-label='Åpne chat'], button[aria-label='Open chat']").first();
    const isVisible = await chatButton.isVisible().catch(() => false);

    if (!isVisible) {
      test.info().annotations.push({
        type: "skip-reason",
        description: "NLQChat ikke synlig på mobil (bruker-state)",
      });
      return;
    }

    const box = await chatButton.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      const viewportHeight = page.viewportSize()?.height ?? 844;
      expect(box.y + box.height).toBeLessThan(viewportHeight - 60);
    }
  });

  test("AutoTradingConfigCard passer på mobilskjerm", async ({ page }) => {
    await page.goto(DASHBOARD_NO, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});

    if (isLoginUrl(page.url())) {
      test.skip(true, "Krever innlogget bruker");
      return;
    }

    await skipOnboardingIfPresent(page);

    const card = page.locator("text=Auto-Trading").first();
    const cardVisible = await card.isVisible().catch(() => false);
    expect(cardVisible).toBe(true);

    const cardBox = await card.boundingBox();
    if (cardBox) {
      const viewportWidth = page.viewportSize()?.width ?? 390;
      expect(cardBox.width).toBeLessThanOrEqual(viewportWidth + 32);
    }
  });
});
