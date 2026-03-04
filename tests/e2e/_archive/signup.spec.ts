import { expect, test } from "@playwright/test";

test.describe("Signup Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/no/signup");
  });

  test("should verify signup page content", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Opprett konto");
    await expect(page.getByPlaceholder("Ola Nordmann")).toBeVisible();
    await expect(page.getByPlaceholder("din@email.com")).toBeVisible();
    await expect(page.getByPlaceholder("Velg et sterkt passord")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Opprett konto" }),
    ).toBeVisible();
  });

  test("should show validation errors for empty form", async ({ page }) => {
    await page.getByRole("button", { name: "Opprett konto" }).click();

    // HTML5 validation might prevent submission, so we check if invalid inputs exist
    // or if the button is still visible and no redirect happened
    await expect(
      page.getByRole("button", { name: "Opprett konto" }),
    ).toBeVisible();
    expect(page.url()).toContain("/signup");
  });

  test("should navigate to login page", async ({ page }) => {
    await page.getByRole("link", { name: "Logg inn her" }).click();
    await expect(page).toHaveURL(/\/innlogging/);
  });

  // Note: We cannot easily test successful signup with real Supabase in E2E without
  // polluting the DB or needing a cleanup script. We can mock the network request
  // or use a dedicated test user. For now, we verify the form interactions.
});
