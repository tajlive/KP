/**
 * @smoke Console Error Guard
 * Verifiserer at landing page og kritiske ruter ikke logger
 * uventede console.error eller console.warn.
 *
 * FEIL SOM IKKE SKAL VÆRE I ALLOW-LIST (vil faile testen):
 * - [auth:google:oauth_failed] Supabase er ikke konfigurert
 * - Supabase access/anon key missing
 * - NEXT_PUBLIC_SUPABASE_URL missing
 */

import { test, expect } from "../fixtures/console-guard";

const publicRoutes = [
  // Uten locale (middleware redirecter)
  "/",
  "/en",
  // Med locale (localePrefix: always)
  "/no",
  "/no/login",
  "/no/priser",
  "/no/jokertrade",
  "/no/leaderboard",
  "/en/login",
  "/en/priser",
];

// Beskyttede ruter (krever login - sjekker console, ikke status)
const protectedRoutes = [
  "/no/dashboard",
  "/no/dashboard/auto-trade",
  "/no/dashboard/portfolio",
  "/no/dashboard/settings",
];

for (const route of publicRoutes) {
  test(`no unexpected console errors on ${route}`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.status()).toBeLessThan(500);

    // Wait for page to stabilize (framer-motion, analytics, etc.)
    await page.waitForTimeout(2000);
  });
}

for (const route of protectedRoutes) {
  test(`no unexpected console errors on protected route ${route}`, async ({
    page,
  }) => {
    // Protected pages vil redirecte til login — det er OK
    // Vi sjekker bare at ingen console errors logges
    await page.goto(route, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
  });
}
