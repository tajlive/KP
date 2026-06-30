import { expect, test } from "./fixtures/console-guard";

const COCKPIT_URL = "/no/handel";

test.describe("Trading Cockpit", () => {
  test("loads cockpit, switches tabs, and emits no unexpected console errors", async ({
    page,
  }) => {
    await page.goto(COCKPIT_URL, { waitUntil: "domcontentloaded" });

    // Wait for the cockpit header and tabs to render
    const overviewTab = page.getByTestId("cockpit-tab-overview");
    const tradesTab = page.getByTestId("cockpit-tab-trades");
    const analysisTab = page.getByTestId("cockpit-tab-analysis");

    await expect(overviewTab).toBeVisible({ timeout: 15_000 });
    await expect(tradesTab).toBeVisible();
    await expect(analysisTab).toBeVisible();

    // Switch to trades tab
    await tradesTab.click();
    await expect(tradesTab).toHaveAttribute("data-state", "active");

    // Switch to analysis tab
    await analysisTab.click();
    await expect(analysisTab).toHaveAttribute("data-state", "active");

    // Switch back to overview
    await overviewTab.click();
    await expect(overviewTab).toHaveAttribute("data-state", "active");
  });
});
