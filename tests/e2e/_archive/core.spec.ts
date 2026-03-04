import { expect, test } from "@playwright/test";

test.describe("Klarpakke Core User Flows", () => {
  test("1. Frontpage loads successfully", async ({ page }) => {
    await page.goto("/no/");
    await expect(page).toHaveTitle(/Klarpakke/i);
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });

  test("2. Auth flow - Login page loads", async ({ page }) => {
    await page.goto("/no/innlogging");
    // InnloggingClient doesn't show the form immediately, it shows OAuth and "Logg inn med e-post" button
    await expect(
      page.getByRole("button", {
        name: /Logg inn med e-post|Sign in with email/i,
      }),
    ).toBeVisible();
  });

  test("3. Dashboard requires authentication", async ({ page }) => {
    await page.goto("/no/dashboard");
    await expect(page).toHaveURL(/.*innlogging.*/);
  });

  test("4. Pricing page shows tiers", async ({ page }) => {
    await page.goto("/no/priser");
    const pricingCards = page.locator(".rounded-2xl.border");
    await expect(pricingCards.first()).toBeVisible();
    const count = await pricingCards.count();
    expect(count).toBeGreaterThan(0);
  });
});
