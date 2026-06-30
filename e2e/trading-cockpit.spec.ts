import { expect, test } from "./fixtures/console-guard";
import { loginAsTestUser } from "./helpers/auth";

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

  test("authenticated user can view trades and analysis tabs", async ({
    page,
  }) => {
    await loginAsTestUser(page, "primary", { redirectUrl: COCKPIT_URL });

    const overviewTab = page.getByTestId("cockpit-tab-overview");
    await expect(overviewTab).toBeVisible({ timeout: 15_000 });

    // Navigate directly to trades tab
    await page.goto(`${COCKPIT_URL}?tab=trades`, { waitUntil: "domcontentloaded" });
    const tradesTab = page.getByTestId("cockpit-tab-trades");
    await expect(tradesTab).toHaveAttribute("data-state", "active", { timeout: 15_000 });
    await expect(page.getByTestId("trades-tab")).toBeVisible();

    // Switch to analysis tab
    const analysisTab = page.getByTestId("cockpit-tab-analysis");
    await analysisTab.click();
    await expect(analysisTab).toHaveAttribute("data-state", "active");
    await expect(page.getByText("cockpit.analysis.title")).toBeVisible();
  });
});
