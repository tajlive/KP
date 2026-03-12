import { test, expect } from '@playwright/test';
import { attachI18nGuard } from '../helpers/i18n-guard';

const CRITICAL_ROUTES = [
  '/no',
  '/en',
  '/no/paper-trading',
  '/en/paper-trading',
  '/no/dashboard',
  '/en/dashboard',
  '/no/priser',
  '/en/priser',
  '/no/innlogging',
  '/en/innlogging',
];

for (const route of CRITICAL_ROUTES) {
  test(`Ingen MISSING_MESSAGE på ${route}`, async ({ page }) => {
    const guard = attachI18nGuard(page);
    await page.goto(route);
    await page.waitForLoadState('networkidle');
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
test('Håndterer korrupt localStorage uten reload-loop', async ({ page }) => {
  // Først: normal lasting
  await page.goto('/no');
  await page.waitForLoadState('networkidle');
  
  // Injiser korrupte tokens i localStorage
  await page.evaluate(() => {
    localStorage.setItem('sb-test-token', '\xFF\xFE\xFD');
    localStorage.setItem('gotrue.current.user', '\xFF\xFE');
    localStorage.setItem('sb-vuxbjlykgmzskxbclquf-auth-token', '{"corrupt": "\xFF\xFE"}');
  });
  
  // Tell reloads
  let reloadCount = 0;
  page.on('load', () => reloadCount++);
  
  // Reload siden - skal håndtere korrupt storage
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  // Vent litt for å sikre at ingen loop skjer
  await page.waitForTimeout(3000);
  
  // Skal maksimalt ha reloaded én gang (for å rense storage)
  expect(reloadCount, 'Skal ikke reloade i loop').toBeLessThan(2);
  
  // Verifiser at siden fortsatt fungerer
  expect(await page.locator('nav').count()).toBeGreaterThan(0);
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
test('Kun en navbar rendres per side', async ({ page }) => {
  const routes = [
    '/no',                    // Marketing page
    '/no/paper-trading',      // App page
    '/no/auto-trading',       // App page
    '/no/copy-trading',       // App page
    '/no/marketplace',        // App page
    '/no/checkout',           // App page
    '/no/innstillinger',      // App page
    '/no/konto',              // App page
    '/no/leagues',            // App page
    '/no/handelshistorikk',   // App page
  ];
  
  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    
    // Tell nav og header elementer (typiske navbar-containere)
    const navCount = await page.locator('nav, header[role="banner"]').count();
    
    expect(
      navCount, 
      `${route} skal ha maks 1 navbar, fant ${navCount}`
    ).toBeLessThanOrEqual(1);
  }
});
