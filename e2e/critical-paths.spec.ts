import { test, expect } from "@playwright/test";

test.describe("Kritiske sider laster", () => {
  test("landingsside (/no)", async ({ page }) => {
    await page.goto("/no");
    await expect(page).toHaveTitle(/Klarpakke/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("priser (/no/priser)", async ({ page }) => {
    await page.goto("/no/priser");
    await expect(page.locator("text=Noe gikk galt")).not.toBeVisible({ timeout: 8000 });
  });

  test("login (/no/login)", async ({ page }) => {
    await page.goto("/no/login");
    await expect(page.getByLabel("E-postadresse")).toBeVisible();
  });

  test("404", async ({ page }) => {
    await page.goto("/no/finnes-ikke");
    await expect(page.locator("body")).not.toBeEmpty();
  });
});

test.describe("Mobil", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("landingsside mobil", async ({ page }) => {
    await page.goto("/no");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("priser mobil", async ({ page }) => {
    await page.goto("/no/priser");
    await expect(page.locator("text=Noe gikk galt")).not.toBeVisible({ timeout: 8000 });
  });
});
