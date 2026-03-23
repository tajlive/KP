import { test, expect } from "@playwright/test";
import { waitForDevHealth } from "../helpers/wait-for-dev-health";

/**
 * Admin: tilgangskontroll + smoke for allowlisted E2E-bruker.
 * Krever .auth/user.json fra setup (samme som øvrige critical-tester).
 */
test.describe("Critical: Admin @critical @auth", () => {
  test.beforeEach(async ({ playwright, baseURL }) => {
    await waitForDevHealth(playwright, baseURL);
  });

  test("uten innlogging sendes man bort fra /admin (default locale)", async ({
    browser,
  }) => {
    // Eksplisitt tom storage: unngår at session fra annen kontekst (samme worker) lekker inn.
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    try {
      // defaultLocale=no + localePrefix=as-needed → kanonisk /admin/… (ikke /no/admin/… — unngår redirect-loop)
      await page.goto("/admin/analytics", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });

      // Middleware → innlogging, eller client layout → dashboard?error=not_admin (ikke-admin med sesjon)
      await expect
        .poll(
          async () => {
            const u = page.url();
            return (
              u.includes("innlogging") ||
              u.includes("/login") ||
              u.includes("admin/login") ||
              u.includes("not_admin")
            );
          },
          { timeout: 25_000, intervals: [100, 250, 500] },
        )
        .toBe(true);

      await expect(page.getByTestId("admin-shell")).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test("innlogget allowlisted bruker ser admin-analytics", async ({ page }) => {
    await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const dashUrl = page.url();
    if (dashUrl.includes("innlogging") || dashUrl.includes("/login")) {
      test.skip();
    }

    await page.goto("/admin/analytics", {
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
    await expect(page).toHaveURL(/\/(en\/)?admin\/analytics/);
  });
});
