/**
 * RSC Error Smoke Test — fanger SSR-feil FØR de når brukerne.
 * 
 * Sjekker at ingen sider har:
 * - data-dgst attributter (React Suspense feil)
 * - "Application error" tekst
 * - "Noe gikk galt" norsk feilmelding
 * 
 * HTML-struktur-validering:
 * - Sjekker at alle offentlige sider har <!DOCTYPE html>, <html> og <body>
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

/**
 * HTML-struktur-validering
 *
 * Sjekker at ALLE offentlige sider har korrekt HTML-struktur:
 * - <!DOCTYPE html> — standard mode
 * - <html> tag — rot-element
 * - <body> tag — synlig innhold
 *
 * Ekskluderer root "/" (den har script redirect, ikke full HTML).
 * Kjører i parallell for rask validering.
 */
const HTML_STRUCTURE_PAGES = [
  "/no",
  "/no/login",
  "/no/jokertrade",
  "/no/leaderboard",
  "/no/priser",
  "/no/bots",
];

test.describe.parallel("HTML Structure Validation", () => {
  for (const pagePath of HTML_STRUCTURE_PAGES) {
    test(`has valid HTML structure on ${pagePath}`, async ({ page }) => {
      const response = await page.goto(pagePath, { waitUntil: "networkidle" });
      expect(response?.ok()).toBe(true);

      const html = await page.content();

      // ✅ Må ha <!DOCTYPE html>
      expect(
        html.trimStart().startsWith("<!DOCTYPE html>") ||
          html.trimStart().toLowerCase().startsWith("<!doctype html>"),
        `${pagePath} mangler <!DOCTYPE html>`,
      ).toBe(true);

      // ✅ Må ha <html>-tag
      expect(
        html.includes("<html"),
        `${pagePath} mangler <html>-tag`,
      ).toBe(true);

      // ✅ Må ha <body>-tag
      expect(
        html.includes("<body"),
        `${pagePath} mangler <body>-tag`,
      ).toBe(true);
    });
  }
});
