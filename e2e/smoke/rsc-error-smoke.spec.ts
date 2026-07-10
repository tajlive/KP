/**
 * RSC Error Smoke Test — fanger SSR-feil FØR de når brukerne.
 * 
 * Sjekker at ingen sider har:
 * - data-dgst attributter (React Suspense feil)
 * - "Application error" tekst
 * - "Noe gikk galt" norsk feilmelding
 */
import { test, expect } from "@playwright/test";

const PAGES = [
  "/no",
  "/no/login",
  "/no/register",
  "/no/jokertrade",
  "/no/leaderboard",
  "/no/priser",
  "/no/kurs",
  "/no/handel",
  "/no/kontakt",
  "/no/om-oss",
  "/no/akademi",
];

test.describe("RSC Error Detection", () => {
  for (const page of PAGES) {
    test(`no RSC errors on ${page}`, async ({ page: pwPage }) => {
      const response = await pwPage.goto(page, { waitUntil: "networkidle" });
      expect(response?.ok()).toBe(true);

      const html = await pwPage.content();

      // ❌ Ingen React Suspense feil
      const suspenseError = await pwPage.locator('template[data-dgst]').count();
      expect(suspenseError, `RSC error (data-dgst) found on ${page}`).toBe(0);

      // ❌ Ingen Application error tekst
      expect(html).not.toContain("Application error");

      // ❌ Ingen norsk feilmelding
      expect(html).not.toContain("Noe gikk galt");

      // ❌ Ingen generisk feil
      const errorPages = await pwPage.locator('text=/Feilkode: \\d+/').count();
      expect(errorPages, `Feilkode found on ${page}`).toBe(0);
    });
  }

  test("landing page has valid hero content", async ({ page }) => {
    await page.goto("/no");
    // Sjekk at siden faktisk rendrer innhold, ikke bare feil
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 5000 });
  });
});
