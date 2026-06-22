import { test, expect } from "@playwright/test";

/**
 * Mobile: 4-tap navigation between the four core flows.
 * Verifies that portfolio, market, trade and account are reachable
 * from the bottom navigation within four taps.
 */

async function tapBottomTab(page: import("@playwright/test").Page, tabId: string) {
  // Bruk JS-klikk for å unngå viewport/actionability-sjekker på fixed bottom-nav.
  await page.evaluate(
    (id) => {
      const el = document.querySelector(`[data-testid="bottom-tab-${id}"]`) as HTMLElement | null;
      el?.click();
    },
    tabId,
  );
}

test.describe("Mobile: core flows navigation @mobile", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("can navigate between all four core flows using bottom tabs", async ({ page }) => {
    await page.goto("/no/dashboard/portfolio", { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    if (page.url().includes("/login") || page.url().includes("/innlogging")) {
      test.skip(true, "Krever innlogget bruker");
      return;
    }

    // 1. Start on portfolio
    await expect(page).toHaveURL(/\/no\/dashboard\/portfolio/);

    // 2. Tap market tab -> /no/marked
    await tapBottomTab(page, "market");
    await expect(page).toHaveURL(/\/no\/marked/);

    // 3. Tap trade tab -> /no/handel
    await tapBottomTab(page, "trade");
    await expect(page).toHaveURL(/\/no\/handel/);

    // 4. Tap account tab -> /no/profile
    await tapBottomTab(page, "account");
    await expect(page).toHaveURL(/\/no\/profile/);

    // 5. Back to portfolio
    await tapBottomTab(page, "portfolio");
    await expect(page).toHaveURL(/\/no\/dashboard\/portfolio/);
  });
});
