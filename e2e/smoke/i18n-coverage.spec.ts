import { test, expect } from "@playwright/test";
import { attachI18nGuard } from "../helpers/i18n-guard";

const CRITICAL_ROUTES = [
  "/no",
  "/en",
  "/no/dashboard",
  "/en/dashboard",
  "/no/priser",
  "/en/priser",
  "/no/innlogging",
  "/en/innlogging",
];

const AUTH_REQUIRED_ROUTES = ["/no/paper-trading", "/en/paper-trading"];

for (const route of CRITICAL_ROUTES) {
  test(`Ingen MISSING_MESSAGE på ${route}`, async ({ page }) => {
    const guard = attachI18nGuard(page);
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    guard.assertNoMissingMessages();
  });
}

/**
 * REGRESJONSTEST: Korrupt localStorage (auth-loop bug)
 *
 * Bug: UTF-8 corrupt localStorage forårsaket infinite reload-loop.
 * Fikset i: src/lib/supabase/safe-storage.ts + src/components/auth/AuthContext.tsx
 *
 * Denne testen sikrer at korrupte tokens håndteres uten loop.
 */
test("Håndterer korrupt localStorage uten reload-loop", async ({ page }) => {
  await page.goto("/no", { waitUntil: "domcontentloaded" });

  await page.evaluate(() => {
    localStorage.setItem("sb-test-token", "\xFF\xFE\xFD");
    localStorage.setItem("gotrue.current.user", "\xFF\xFE");
    localStorage.setItem(
      "sb-pskhryjzkobytnfwucrb-auth-token",
      '{"corrupt": "\xFF\xFE"}',
    );
  });

  // Tell full page loads etter navigasjon (ikke reload): mer stabilt med Next dev + Fast Refresh
  let loadCount = 0;
  const onLoad = () => {
    loadCount += 1;
  };
  page.on("load", onLoad);

  await page.goto("/no", { waitUntil: "domcontentloaded" });

  await page.waitForTimeout(5000);

  page.off("load", onLoad);

  // Én navigasjon = 1 load; ekstra hopp fra safe-storage er OK; Next dev kan gi +1 (Fast Refresh)
  expect(
    loadCount,
    "Skal ikke ha mange full loads (unngå uendelig loop)",
  ).toBeLessThan(6);

  await expect(page.getByTestId("site-navigation")).toBeVisible();
});

/**
 * REGRESJONSTEST: Dobbel navbar (layout nesting bug)
 *
 * Bug: 10 app-layouts hadde <Navigation> i tillegg til <MarketingNavigation>
 * fra parent layout, som ga dobbel navbar.
 * Fikset i: Alle src/app/[locale]/{star}/layout.tsx filer
 *
 * Denne testen sikrer at kun en nav/header rendres per side.
 */
test("Kun en navbar rendres per side", async ({ page }) => {
  const routes = ["/no", "/no/priser", "/no/innlogging", "/no/kurs"];

  for (const route of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const siteNav = page.getByTestId("site-navigation");
    await expect(siteNav).toBeVisible({ timeout: 15_000 });
    await expect(siteNav).toHaveCount(1);
  }
});
