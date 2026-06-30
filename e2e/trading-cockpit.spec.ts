import { expect, test } from "./fixtures/console-guard";

const COCKPIT_URL = "/no/handel";

test.describe("Trading Cockpit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(COCKPIT_URL, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("cockpit-header")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("overview tab loads with KPI cards, sessions and status", async ({
    page,
  }) => {
    await expect(page.getByTestId("cockpit-header")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("cockpit-tab-overview")).toBeVisible();
    await expect(page.getByTestId("cockpit-tab-trades")).toBeVisible();
    await expect(page.getByTestId("cockpit-tab-analysis")).toBeVisible();

    // KPI cards
    await expect(page.getByText("Total kapital").first()).toBeVisible();
    await expect(page.getByText("P&L").first()).toBeVisible();
    await expect(page.getByText("Vinnrate").first()).toBeVisible();
    await expect(page.getByText("Handler").first()).toBeVisible();

    // Status summary
    await expect(page.getByText("Aktiv").first()).toBeVisible();
    await expect(page.getByText("Pauset").first()).toBeVisible();
    await expect(page.getByText("Stoppet").first()).toBeVisible();
    await expect(page.getByText("Krasjet").first()).toBeVisible();

    // Sessions section
    await expect(page.getByText("Sesjoner").first()).toBeVisible();
  });

  test("trades tab shows filters, empty state and pagination controls", async ({
    page,
  }) => {
    await page.goto(`${COCKPIT_URL}?tab=trades`, {
      waitUntil: "domcontentloaded",
    });

    const tradesTab = page.getByTestId("cockpit-tab-trades");
    await expect(tradesTab).toHaveAttribute("data-state", "active", {
      timeout: 15_000,
    });
    await expect(page.getByTestId("trades-tab")).toBeVisible();

    // Filters visible on desktop
    await expect(page.getByPlaceholder("Søk etter handler...")).toBeVisible();
    await expect(page.getByText("30 dager").first()).toBeVisible();

    // Empty state in Norwegian
    await expect(page.getByTestId("trade-empty-state")).toBeVisible();
    await expect(page.getByText("Ingen handler", { exact: true })).toBeVisible();
    await expect(page.getByText("Ingen handler matcher valgte filter.")).toBeVisible();
  });

  test("analysis tab shows period selector, stat grid and charts", async ({
    page,
  }) => {
    await page.goto(`${COCKPIT_URL}?tab=analysis`, {
      waitUntil: "domcontentloaded",
    });

    const analysisTab = page.getByTestId("cockpit-tab-analysis");
    await expect(analysisTab).toHaveAttribute("data-state", "active", {
      timeout: 15_000,
    });

    // Norwegian title
    await expect(
      page.getByRole("heading", { name: "Analyse" }).first(),
    ).toBeVisible();

    // Period selector
    await expect(page.getByText("Periode").first()).toBeVisible();
    await expect(page.getByText("Siste 30 dager").first()).toBeVisible();

    // Stat grid
    await expect(page.getByText("Handler totalt").first()).toBeVisible();
    await expect(page.getByText("Vinnrate").first()).toBeVisible();
    await expect(page.getByText("Total P&L").first()).toBeVisible();
    await expect(page.getByText("Gebyrer").first()).toBeVisible();

    // Charts
    await expect(page.getByText("P&L over tid").first()).toBeVisible();
    await expect(page.getByText("Per symbol").first()).toBeVisible();
  });

  test("mobile responsive view renders tabs and filter sheet", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${COCKPIT_URL}?tab=trades`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByTestId("cockpit-tab-trades")).toBeVisible({
      timeout: 15_000,
    });

    // Mobile filter sheet button
    const filterButton = page.getByRole("button", { name: "Filter" });
    await expect(filterButton).toBeVisible();
    await filterButton.click();
    await expect(page.getByText("Datoområde").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Bruk" })).toBeVisible();
  });
});
