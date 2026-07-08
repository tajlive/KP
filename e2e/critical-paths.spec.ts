import { test, expect } from "@playwright/test";

test.describe("Kritiske sider laster", () => {
  test("landingsside (/no)", async ({ page }) => {
    await page.goto("/no");
    await expect(page).toHaveTitle(/Klarpakke/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("priser (/no/priser) — ingen krasj", async ({ page }) => {
    await page.goto("/no/priser");
    await expect(page.locator("text=Noe gikk galt")).not.toBeVisible({ timeout: 5000 });
    await expect(page).toHaveTitle(/Priser/);
  });

  test("login (/no/login)", async ({ page }) => {
    await page.goto("/no/login");
    await expect(page.getByLabel("E-postadresse")).toBeVisible();
    await expect(page.getByLabel("Passord")).toBeVisible();
  });

  test("register (/no/register)", async ({ page }) => {
    await page.goto("/no/register");
    await expect(page.getByRole("button", { name: /Fortsett med Google/i })).toBeVisible();
  });

  test("404 side", async ({ page }) => {
    await page.goto("/no/denne-finnes-ikke");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    // Should not be blank
    await expect(page.locator("body")).not.toHaveText(/^\s*$/);
  });
});

test.describe("Navigasjon", () => {
  test("navbar — Logg inn er ikke deaktivert", async ({ page }) => {
    await page.goto("/no");
    const loginBtn = page.getByRole("link", { name: /Logg inn/i });
    await expect(loginBtn).toBeVisible();
    const isDisabled = await loginBtn.evaluate((el) =>
      el.querySelector("button")?.hasAttribute("disabled")
    );
    expect(isDisabled).toBeFalsy();
  });

  test("navbar — Registrer deg er ikke deaktivert", async ({ page }) => {
    await page.goto("/no");
    const registerBtn = page.getByRole("link", { name: /Registrer deg/i });
    await expect(registerBtn).toBeVisible();
    const isDisabled = await registerBtn.evaluate((el) =>
      el.querySelector("button")?.hasAttribute("disabled")
    );
    expect(isDisabled).toBeFalsy();
  });
});

test.describe("Mobil", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("landingsside på mobil", async ({ page }) => {
    await page.goto("/no");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("priser på mobil", async ({ page }) => {
    await page.goto("/no/priser");
    await expect(page.locator("text=Noe gikk galt")).not.toBeVisible({ timeout: 5000 });
  });
});
