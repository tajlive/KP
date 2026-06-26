import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Landing page redesign", () => {
  test("shows edu-fintech hero and live market strip", async ({ page }) => {
    await page.goto("/no");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText(/Live markeder/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Start gratis/i }).first(),
    ).toBeVisible();
  });

  test("has no accessibility violations on landing", async ({ page }) => {
    await page.goto("/no");
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
