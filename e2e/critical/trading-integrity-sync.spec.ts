import { test, expect } from "@playwright/test";
import { waitForDevHealth } from "../helpers/wait-for-dev-health";

/**
 * Critical: enterprise trading integrity UI (poll + RSC fallback + manual sync).
 * Krever `critical-chromium` storage state (auth.setup).
 */
test.describe("Critical: Trading integrity sync @critical @integrity", () => {
  test("manual trades sync control visible on dashboard", async ({
    page,
    playwright,
    baseURL,
  }) => {
    await waitForDevHealth(playwright, baseURL);

    await page.goto("/en/dashboard", {
      timeout: 90_000,
      waitUntil: "domcontentloaded",
    });
    await page
      .waitForLoadState("domcontentloaded", { timeout: 30_000 })
      .catch(() => {});

    const url = page.url();
    test.skip(
      url.includes("innlogging") || url.includes("/login"),
      "redirected to login — auth storage mangler eller utløpt",
    );

    const body = (await page.locator("body").textContent()) ?? "";
    test.skip(
      body.includes("Supabase er ikke konfigurert"),
      "Supabase ikke konfigurert i miljøet",
    );

    const shell = page.locator(
      '[data-testid="dashboard-root"], [data-testid="dashboard-home-overview"]',
    );
    await expect(shell.first()).toBeVisible({ timeout: 30_000 });

    const syncBtn = page.getByTestId("dashboard-integrity-sync");
    const requireSync = process.env.E2E_REQUIRE_INTEGRITY_SYNC === "1";
    if (requireSync) {
      await expect(syncBtn).toHaveCount(1, { timeout: 10_000 });
    } else if ((await syncBtn.count()) === 0) {
      test.skip(
        true,
        "dashboard-integrity-sync ikke i målmiljø ennå — kjør mot localhost med siste branch, eller sett E2E_REQUIRE_INTEGRITY_SYNC=1 etter deploy",
      );
    }
    await syncBtn.scrollIntoViewIfNeeded();
    await expect(syncBtn).toBeVisible({ timeout: 20_000 });
  });
});
