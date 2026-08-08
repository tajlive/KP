import { test, expect } from "@playwright/test";

const PAGES = [
  "/",
  "/no",
  "/no/handel",
  "/no/handel?tab=analysis",
  "/no/handel?tab=sessions",
  "/no/dashboard",
  "/no/dashboard/portfolio",
  "/no/priser",
  "/no/kurs",
];

// Rå i18n-nøkkel = "namespace.section.key" (3+ segmenter) der namespace er et
// kjent toppnivå. Case-insensitiv: CSS text-transform gjør nøklene STORE
// (TRADING.COCKPIT.TRADES.TITLECOUNT). Krever ≥2 segmenter etter namespace
// for å unngå false positives på vanlige ord.
const RAW_KEY_PATTERN =
  /\b(dashboard|trading|common|portfolio|admin|onboarding|navigation|wallet|legal)\.[a-z0-9_]+(?:\.[a-zA-Z0-9_]+){1,}\b/gi;

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
