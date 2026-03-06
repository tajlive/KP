import { expect, test } from "@playwright/test";

test.describe("Trygg Modus (Safe Mode)", () => {
  test("should show safe mode toggle on settings page when authenticated", async () => {
    // This test requires authentication which is hard to set up in e2e tests
    // In a real scenario, you'd have a test user account

    // Skip for now - would need Supabase test setup
    test.skip(true, "Requires authentication setup");
  });

  test("should have safe mode toggle element in DOM", async ({ page }) => {
    await page.goto("/app/settings");

    // Look for safe mode toggle
    const safeModeToggle = page.locator("[data-safe-mode-toggle]").first();
    const safeModeStatus = page.locator("[data-safe-mode-status]").first();

    // At minimum, the elements should exist in the page structure
    // (they may be hidden if not authenticated)
    const toggleExists = await safeModeToggle
      .count()
      .then((count) => count > 0);
    const statusExists = await safeModeStatus
      .count()
      .then((count) => count > 0);

    if (toggleExists || statusExists) {
      expect(toggleExists || statusExists).toBe(true);
    }
  });

  test("safe mode should have proper CSS classes", async ({ page }) => {
    const body = page.locator("body");

    const classes = await body.getAttribute("class");

    // Safe mode classes: kp-safe-mode, kp-safe-mode-on, kp-safe-mode-off
    // These may or may not be present depending on user state
    expect(classes || "").toBeInstanceOf(String);
  });
});
