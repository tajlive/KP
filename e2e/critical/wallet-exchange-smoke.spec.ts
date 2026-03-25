import { test, expect } from "@playwright/test";
import { waitForDevHealth } from "../helpers/wait-for-dev-health";

test.describe("Critical: Wallet exchange smoke @critical @wallet", () => {
  test("wallet page loads and exchange panel is visible", async ({
    page,
    playwright,
    baseURL,
  }) => {
    await waitForDevHealth(playwright, baseURL);

    await page.goto("/no/konto", {
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

    await expect(
      page.getByRole("heading", { name: /koble til børs|connect exchange/i }),
    ).toBeVisible({ timeout: 20_000 });

    const connectButton = page.getByRole("button", {
      name: /koble til sikkert|connect securely/i,
    });
    await expect(connectButton).toBeVisible({ timeout: 20_000 });
    await expect(connectButton).toBeDisabled();

    const refreshButton = page.getByRole("button", {
      name: /oppdater saldo|refresh balances/i,
    });
    await expect(refreshButton).toBeVisible({ timeout: 20_000 });
  });
});

