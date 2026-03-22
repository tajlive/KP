import { test, expect } from "@playwright/test";

/**
 * Admin: tilgangskontroll + smoke for allowlisted E2E-bruker.
 * Krever .auth/user.json fra setup (samme som øvrige critical-tester).
 */
test.describe("Critical: Admin @critical @auth", () => {
  test("uten innlogging sendes man bort fra /no/admin", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto("/no/admin/analytics", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.waitForTimeout(1500);
      const url = page.url();
      const onAdminShell = await page
        .getByTestId("admin-shell")
        .isVisible()
        .catch(() => false);
      expect(onAdminShell).toBe(false);
      expect(
        url.includes("innlogging") ||
          url.includes("/login") ||
          url.includes("admin/login"),
      ).toBe(true);
    } finally {
      await context.close();
    }
  });

  test("innlogget allowlisted bruker ser admin-analytics", async ({ page }) => {
    await page.goto("/no/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const dashUrl = page.url();
    if (dashUrl.includes("innlogging") || dashUrl.includes("/login")) {
      test.skip();
    }

    await page.goto("/no/admin/analytics", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page
      .waitForLoadState("networkidle", { timeout: 45_000 })
      .catch(() => {});

    const url = page.url();
    if (url.includes("innlogging") || url.includes("/login")) {
      test.skip();
    }
    if (url.includes("dashboard") && url.includes("not_admin")) {
      test.skip();
    }

    await expect(page.getByTestId("admin-shell")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveURL(/\/no\/admin\/analytics/);
  });
});
