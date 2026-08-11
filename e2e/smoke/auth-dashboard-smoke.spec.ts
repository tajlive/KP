/**
 * POST-DEPLOY SMOKE — innlogget dashboard-sjekk (2026-standard).
 *
 * Bakgrunn (2026-08-09): QueryClientProvider-krasj på /no/dashboard nådde prod
 * og ble oppdaget av BRUKEREN — ikke systemet. Uautentisert smoke (health,
 * landing, i18n) kan aldri fange innloggede JS-krasj. Denne testen kjører
 * ETTER hver deploy i deploy.yml (e2e-smoke-auth-prod) og feiler →
 * auto-rollback før ekte brukere treffer den bruttede flyten.
 *
 * Krever: .auth/user.json (genereres av e2e/auth.setup.ts i samme jobb).
 *
 * Sjekker:
 *  1. Ingen «No QueryClient set» eller andre React-krasj i konsollen
 *  2. Siden returnerer < 500
 *  3. Ingen feil-skjerm («Det oppstod en feil») synlig
 *  4. Kritisk innhold rendres (dashboard-testid)
 */

import { test, expect } from "../fixtures/console-guard";

const KRITISKE_RUTER = ["/no/dashboard", "/no/handel"];

for (const route of KRITISKE_RUTER) {
  test(`[post-deploy] innlogget smoke: ${route}`, async ({ page }) => {
    // networkidle nås ALDRI på /no/handel — TradingCockpit poller hvert 5 s
    // (bevisst: levende priser). load = HTML+ressurser lastet, så venter vi
    // på hydration + element-sjekkene under.
    const response = await page.goto(route, { waitUntil: "load" });
    expect(
      response?.status(),
      `${route} returnerte ${response?.status()} (>= 500)`,
    ).toBeLessThan(500);

    // Vent på hydration — client-komponenter (useQuery etc.) krasjer her
    await page.waitForTimeout(4000);

    // Feil-skjerm (Next.js error boundary) skal ikke vises
    const feilSynlig = await page
      .getByText(/Det oppstod en feil|Something went wrong/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(feilSynlig, `${route} viser feil-skjerm`).toBe(false);

    // Kritisk rot-element skal finnes (dashboard har data-testid)
    if (route === "/no/dashboard") {
      const dashboard = page.locator('[data-testid="dashboard-page"]');
      await expect(
        dashboard,
        "dashboard-page ikke rendret — sannsynlig JS-krasj",
      ).toBeVisible({ timeout: 15000 });
    }
  });
}
