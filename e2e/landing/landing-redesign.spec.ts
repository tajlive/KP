import { test, expect } from "@playwright/test";

test.describe("Landing page redesign", () => {
  test("shows edu-fintech hero and live market strip", async ({ page }) => {
    await page.goto("/no");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText(/Live markeder/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Start gratis/i }).first()).toBeVisible();
  });

  test("has no accessibility violations on landing", async ({ page }) => {
    await page.goto("/no");
    // @ts-expect-error AxeBuilder may not be typed in this project
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
