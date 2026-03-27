/**
 * Visual Regression Tests
 * 
 * Screenshot comparison for critical pages to catch CSS regressions.
 * Run with: playwright test --update-snapshots to create baselines
 */

import { test, expect } from "@playwright/test";

// Pages to test
const pages = [
  { path: "/", name: "landing" },
  { path: "/no/priser", name: "pricing" },
  { path: "/no/innlogging", name: "login" },
];

for (const { path, name } of pages) {
  test.describe(`Visual regression: ${name}`, () => {
    test(`${name} page matches snapshot`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      
      // Wait for fonts to load
      await page.waitForTimeout(500);
      
      // Screenshot with 2% pixel difference tolerance
      await expect(page).toHaveScreenshot(`${name}.png`, {
        maxDiffPixelRatio: 0.02,
        fullPage: true,
      });
    });

    test(`${name} page on mobile matches snapshot`, async ({ page }) => {
      // Mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto(path, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot(`${name}-mobile.png`, {
        maxDiffPixelRatio: 0.02,
        fullPage: true,
      });
    });
  });
}

// Critical component tests
test.describe("Critical components", () => {
  test("buttons have correct brand color", async ({ page }) => {
    await page.goto("/no");
    
    // Check primary button color
    const primaryButton = page.locator("button").filter({ hasText: /start|gratis/i }).first();
    await expect(primaryButton).toBeVisible();
    
    // Get computed style
    const bgColor = await primaryButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    // Should be blue (#0052FF or rgb(0, 82, 255))
    expect(bgColor).toContain("0, 82, 255");
  });

  test("font family is Inter", async ({ page }) => {
    await page.goto("/no");
    
    const bodyFont = await page.evaluate(() => {
      return window.getComputedStyle(document.body).fontFamily;
    });
    
    expect(bodyFont).toContain("Inter");
  });
});
