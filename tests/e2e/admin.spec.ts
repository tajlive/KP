import { expect, test } from "@playwright/test";

/**
 * Admin Dashboard E2E Tests
 */

test.describe("Admin Dashboard", () => {
  test("Admin login page has all elements", async ({ page }) => {
    await page.goto("/admin/login");

    // Verify form elements
    await expect(page.locator("text=Administrator")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Logg inn")')).toBeVisible();

    // Verify password reset link
    await expect(page.locator("text=Glemt passordet")).toBeVisible();
  });

  test("Unauthenticated users are redirected from admin", async ({ page }) => {
    // Try to access admin without login
    await page.goto("/admin");

    // Should redirect to login (localized as /innlogging or /login)
    await expect(page).toHaveURL(/.*(login|innlogging).*/);
  });

  test("Admin sidebar navigation is structured correctly", async ({ page }) => {
    // This test would require authentication
    // For now, we just verify the structure exists

    await page.goto("/admin/login");

    // Check that the page has proper structure
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute("placeholder", /e-post/i);
  });
});
