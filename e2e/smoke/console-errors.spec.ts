/**
 * @smoke Console Error Guard
 * Verifiserer at landing page og kritiske ruter ikke logger
 * uventede console.error eller console.warn.
 */

import { test, expect } from "../fixtures/console-guard";

const publicRoutes = [
  "/",
  "/priser",
  "/login",
  "/en",
  "/en/priser",
  "/en/login",
];

for (const route of publicRoutes) {
  test(`no unexpected console errors on ${route}`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.status()).toBeLessThan(500);

    // Wait for page to stabilize (framer-motion, analytics, etc.)
    await page.waitForTimeout(2000);
  });
}
