/**
 * @auth Console Error Guard — alle sider mens innlogget
 *
 * Går gjennom alle beskyttede sider etter innlogging og sjekker
 * at ingen uventede console.error eller console.warning logges.
 *
 * Krever: .auth/user.json (genereres av auth.setup.ts)
 */

import { test, expect } from "../fixtures/console-guard";

const authedRoutes = [
  // Dashboard
  "/no/dashboard",
  "/no/dashboard/auto-trade",
  "/no/dashboard/portfolio",

  // Handel
  "/no/handel",

  // Bruker
  "/no/profile",
  "/no/dashboard/settings",
];

for (const route of authedRoutes) {
  test(`[auth] no unexpected console errors on ${route}`, async ({
    page,
  }) => {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.status()).toBeLessThan(500);

    // Vent pa at client-side komponenter stabiliserer seg
    await page.waitForTimeout(3000);
  });
}
