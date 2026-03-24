/**
 * Røyktest: dashboard → handelshistorikk → GET /api/paper-trading/balance.
 * Krever: dev-server + ev. `npm run test:e2e:prepare` (eller gyldig `.auth/user.json`).
 */
import { expect, test } from "@playwright/test";
import { waitForDevHealth } from "../helpers/wait-for-dev-health";

test.describe("@debug", () => {
  test("paper trace: dashboard SSR + handelshistorikk + balance API", async ({
    page,
    playwright,
    baseURL,
  }) => {
    await waitForDevHealth(playwright, baseURL);

    await page.goto("/no/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expect(page.locator("body")).toBeVisible();

    await page.goto("/no/handelshistorikk", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expect(
      page.getByRole("heading", { name: "Handelshistorikk" }),
    ).toBeVisible({ timeout: 60_000 });

    await expect(
      page.getByText("Ingen handler ennå").or(page.locator("table")).first(),
    ).toBeVisible({ timeout: 45_000 });

    const balRes = await page.request.get("/api/paper-trading/balance");
    expect([200, 401]).toContain(balRes.status());
  });
});
