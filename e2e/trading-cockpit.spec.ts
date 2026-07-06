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

  test("trades tab shows filters, data table and pagination controls", async ({
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

    // Filters visible
    await expect(page.getByPlaceholder("Søk etter handler...")).toBeVisible();
    await expect(page.getByText("30 dager").first()).toBeVisible();

    // Trade data view visible (table on desktop, cards on mobile; both exist in DOM so use first)
    await expect(
      page.getByTestId("trade-table").or(page.getByTestId("trade-cards")).first(),
    ).toBeVisible();

    // Pagination controls visible when more data may exist
    await expect(page.getByTestId("trade-pagination")).toBeVisible();
  });

  test("trades tab shows empty state when filters match nothing", async ({
    page,
  }) => {
    await page.goto(`${COCKPIT_URL}?tab=trades`, {
      waitUntil: "domcontentloaded",
    });

    const tradesTab = page.getByTestId("cockpit-tab-trades");
    await expect(tradesTab).toHaveAttribute("data-state", "active", {
      timeout: 15_000,
    });

    // Wait for the trades data view to be present before filtering
    await expect(
      page.getByTestId("trade-table").or(page.getByTestId("trade-cards")).first(),
    ).toBeVisible();

    // Search for something that cannot match any trade
    const searchInput = page.getByPlaceholder("Søk etter handler...");
    await searchInput.fill("XYZ-NONEXISTENT-SEARCH");
    await searchInput.press("Enter");

    // Wait for the loading indicator to disappear and empty state to appear
    await expect(page.getByTestId("trades-loading-indicator")).toBeHidden({ timeout: 10_000 });

    // Empty state visible when no trades match the filters
    const emptyState = page.getByTestId("trade-empty-state");
    await expect(emptyState).toBeVisible({ timeout: 10_000 });
    await expect(
      emptyState.getByText("Ingen handler", { exact: true }),
    ).toBeVisible();
    await expect(
      emptyState.getByText("Ingen handler matcher valgte filter."),
    ).toBeVisible();
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

  test("PWA manifest and service worker are wired for /no/handel", async ({
    page,
  }) => {
    const manifestLink = await page
      .locator('link[rel="manifest"]')
      .getAttribute("href");
    expect(manifestLink).toBeTruthy();

    const manifest = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]');
      if (!link) return null;
      const res = await fetch(link.getAttribute("href") || "");
      return res.ok ? res.json() : null;
    });

    expect(manifest).not.toBeNull();
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/no/handel");
    expect(
      manifest.icons.some(
        (icon: { sizes: string }) =>
          icon.sizes === "192x192" || icon.sizes === "512x512"
      )
    ).toBe(true);

    const swState = await page.evaluate(() => {
      if (!("serviceWorker" in navigator)) return "unsupported";
      return navigator.serviceWorker.ready
        .then((registration) => {
          const active =
            navigator.serviceWorker.controller || registration.active || registration.installing;
          const script = active?.scriptURL || "";
          return script.includes("/sw.js") ? "registered" : "failed";
        })
        .catch(() => "failed");
    });

    expect(["registered", "unsupported"]).toContain(swState);
  });
});
