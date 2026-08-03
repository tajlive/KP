import { test, expect } from "@playwright/test";

const PAGES = [
  "/",
  "/trade",
  "/dashboard",
  "/dashboard/portfolio",
  "/dashboard/historikk",
  "/priser",
  "/kurs",
];

// Rå i18n-nøkkel = "namespace.section.key" der namespace er et kjent toppnivå
const RAW_KEY_PATTERN = /\b(dashboard|trading|common|portfolio)\.[a-z]+\.[a-zA-Z]+\b/g;

test.describe("i18n — ingen rå nøkler", () => {
  for (const path of PAGES) {
    test(`${path} viser ikke rå i18n-nøkler`, async ({ page }) => {
      const response = await page.goto(path);
      expect(
        response?.status(),
        `${path} skal returnere 200 (ikke 404/500)`
      ).toBeLessThan(400);

      await expect(page.locator("body")).toBeVisible();
      await page.waitForTimeout(2000);

      // innerText = kun synlig tekst (script/RSC-payloads og style blokkeres ut)
      const bodyText = await page.locator("body").innerText();
      const matches = bodyText.match(RAW_KEY_PATTERN) ?? [];

      expect(
        matches.length,
        `Fant rå i18n-nøkler på ${path}: ${matches.join(", ")}`
      ).toBe(0);
    });
  }
});
