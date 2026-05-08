import { test, expect } from "@playwright/test";
import { hasSupabaseSessionCookies } from "../helpers/supabase-cookies";
import { waitForDevHealth } from "../helpers/wait-for-dev-health";

/**
 * Full rute-gjennomgang med innlogget storageState (testbruker etter setup).
 * defaultLocale=no, localePrefix=as-needed → kanoniske stier uten /no-prefix der mulig.
 *
 * Kjør: PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000 npx playwright test e2e/regression/authenticated-route-audit.spec.ts --project=regression-chromium
 */
test.describe.configure({ mode: "serial", timeout: 900_000 });

type RouteRule = {
  path: string;
  /** Må ikke ende på innlogging/login når sesjon finnes */
  mustBeAuthed?: boolean;
  /** Admin: tillat redirect til dashboard?error=not_admin eller innlogging */
  adminOptional?: boolean;
  /** Forvent HTTP >= 400 (f.eks. test-side) */
  allowClientError?: boolean;
};

const ROUTES: RouteRule[] = [
  { path: "/" },
  { path: "/kurs" },
  { path: "/kurs/grunnleggende" },
  { path: "/kurs/grunnleggende/leksjon/introduksjon-til-krypto" },
  { path: "/kurs/strategi/leksjon/dollar-cost-averaging" },
  { path: "/priser" },
  { path: "/paper-trading", mustBeAuthed: true },
  { path: "/auto-trading" },
  { path: "/live-trading" },
  { path: "/trade" },
  { path: "/kontakt" },
  { path: "/om-oss" },
  { path: "/personvern" },
  { path: "/vilkar" },
  { path: "/hjelp" },
  { path: "/kalkulator" },
  { path: "/interessetest" },
  { path: "/velg-strategi" },
  { path: "/binance-guide" },
  { path: "/leaderboard" },
  { path: "/velkommen" },
  { path: "/verify" },
  { path: "/innlogging" },
  { path: "/signup" },
  { path: "/glemt-passord" },
  { path: "/dashboard", mustBeAuthed: true },
  { path: "/handelshistorikk", mustBeAuthed: true },
  { path: "/innstillinger", mustBeAuthed: true },
  { path: "/profile", mustBeAuthed: true },
  { path: "/varsler", mustBeAuthed: true },
  { path: "/konto", mustBeAuthed: true },
  { path: "/akademi", mustBeAuthed: true },
  { path: "/quiz", mustBeAuthed: true },
  { path: "/copy-trading", mustBeAuthed: true },
  { path: "/marketplace", mustBeAuthed: true },
  { path: "/dashboard/auto-trade", mustBeAuthed: true },
  { path: "/dashboard/settings", mustBeAuthed: true },
  { path: "/dashboard/resultater", mustBeAuthed: true },
  { path: "/dashboard/portfolio", mustBeAuthed: true },
  { path: "/dashboard/referral", mustBeAuthed: true },
  { path: "/dashboard/tax-report", mustBeAuthed: true },
  { path: "/akademi/dashboard-guide", mustBeAuthed: true },
  { path: "/onboarding" },
  { path: "/onboarding/step1-welcome" },
  { path: "/onboarding/step2-experience" },
  { path: "/onboarding/step3-trading-mode" },
  { path: "/onboarding/step4-binance" },
  { path: "/onboarding/step5-complete" },
  { path: "/checkout" },
  { path: "/checkout/success" },
  { path: "/priser/success" },
  { path: "/priser/cancel" },
  { path: "/feil/ikke-funnet" },
  { path: "/feil/serverfeil" },
  { path: "/feil/ingen-tilgang" },
  { path: "/beta" },
  { path: "/beta/live-trading" },
  { path: "/beta/dashboard" },
  { path: "/admin/analytics", adminOptional: true },
  { path: "/admin/users", adminOptional: true },
  { path: "/admin/students", adminOptional: true },
  { path: "/admin/system", adminOptional: true },
  { path: "/admin/settings", adminOptional: true },
  { path: "/admin/campaign", adminOptional: true },
  { path: "/admin/monetization", adminOptional: true },
  { path: "/admin/ab-tests", adminOptional: true },
  { path: "/admin/sync-status", adminOptional: true },
  { path: "/admin/auto-trading", adminOptional: true },
  { path: "/admin/auto-trading/sessions", adminOptional: true },
  { path: "/admin/forgot-password", adminOptional: true },
  { path: "/admin/login", adminOptional: true },
  { path: "/admin", adminOptional: true },
  {
    path: "/dashboard/sentry-test",
    mustBeAuthed: true,
    allowClientError: true,
  },
  { path: "/en/dashboard", mustBeAuthed: true },
  { path: "/en/priser" },
  { path: "/en/paper-trading", mustBeAuthed: true },
];

test.describe("Regression: authenticated full route audit @regression @audit", () => {
  test("alle ruter laster uten crash (serial)", async ({
    page,
    playwright,
    baseURL,
  }) => {
    await waitForDevHealth(playwright, baseURL);

    const cookies = await page.context().cookies();
    test.skip(
      !hasSupabaseSessionCookies(cookies),
      "Ingen sb-auth cookies — setup mangler",
    );

    const failures: string[] = [];

    for (const rule of ROUTES) {
      await test.step(rule.path, async () => {
        try {
          const response = await page.goto(rule.path, {
            waitUntil: "domcontentloaded",
            timeout: 90_000,
          });
          const status = response?.status() ?? 0;
          const url = page.url();

          if (!rule.allowClientError && status >= 400 && status !== 404) {
            failures.push(`${rule.path}: HTTP ${status}`);
          }

          if (rule.mustBeAuthed) {
            const bouncedToLogin =
              url.includes("/innlogging") ||
              url.includes("/login") ||
              (url.includes("/signup") && !rule.path.includes("/signup"));
            if (bouncedToLogin) {
              failures.push(
                `${rule.path}: forventet innlogget visning, endte på ${url}`,
              );
            }
          }

          if (rule.adminOptional) {
            const okAdmin =
              url.includes("/admin/") &&
              !url.includes("innlogging") &&
              !url.includes("/login");
            const okRedirect =
              url.includes("not_admin") ||
              url.includes("innlogging") ||
              url.includes("/login") ||
              url.includes("admin/login");
            if (!okAdmin && !okRedirect) {
              failures.push(
                `${rule.path}: uventet URL etter admin-forsøk ${url}`,
              );
            }
          }

          await expect(
            page.locator("body"),
            `${rule.path}: tom body`,
          ).toBeVisible({ timeout: 5_000 });
        } catch (e) {
          failures.push(
            `${rule.path}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      });
    }

    expect(failures, failures.join("\n---\n")).toEqual([]);
  });

  test("handel: /trade → paper-trading og auto-trade laster innlogget", async ({
    page,
    playwright,
    baseURL,
  }) => {
    await waitForDevHealth(playwright, baseURL);

    const cookies = await page.context().cookies();
    test.skip(
      !hasSupabaseSessionCookies(cookies),
      "Ingen sb-auth cookies — setup mangler",
    );

    await page.goto("/trade", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expect(page).toHaveURL(/paper-trading/);

    const res = await page.goto("/dashboard/auto-trade", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    expect(res?.status() ?? 0).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible({ timeout: 5_000 });
  });
});
