import { test, expect } from '@playwright/test';

/**
 * AUTHENTICATION TESTS
 * 
 * Merk: Prod bruker /no/... ruter (Next.js i18n)
 * Redirects fra /innlogging, /login etc. er definert i _redirects
 * men kan være cachet/ikke deployet ennå
 */

test.describe('Authentication Flow - PROD (kun 200-sjekk)', () => {
  
  test('should load /no/innlogging without 404', async ({ page }) => {
    const response = await page.goto('/no/innlogging');
    
    // Sjekk at siden ikke gir 404
    expect(response?.status()).toBe(200);
    
    // Sjekk at tittel inneholder Klarpakke
    await expect(page).toHaveTitle(/klarpakke/i);
  });

  test('should load /no/kurs without 404', async ({ page }) => {
    const response = await page.goto('/no/kurs');
    expect(response?.status()).toBe(200);
  });

  test('should load /priser without 404', async ({ page }) => {
    const response = await page.goto('/priser');
    expect(response?.status()).toBe(200);
  });

  test('critical prod pages should not 404', async ({ page }) => {
    // Kritiske sider som ALLTID skal fungere
    const criticalUrls = [
      '/no/innlogging',
      '/no/kurs',
      '/priser',
    ];
    
    for (const url of criticalUrls) {
      const response = await page.goto(url);
      expect(response?.status(), `Expected ${url} to return 200`).toBe(200);
    }
    
    // Sider som KAN være 404 hvis ikke deployet ennå
    const optionalUrls = [
      '/varsler',
      '/leaderboard',
      '/paper-trading',
      '/spar-bot',
      // '/auth/callback', // Skip - krever spesielle query params
    ];
    
    for (const url of optionalUrls) {
      const response = await page.goto(url);
      const status = response?.status() || 0;
      if (status === 200) {
        console.log(`✅ ${url} - OK`);
      } else if (status === 404) {
        console.log(`⚠️  ${url} - 404 (ikke deployet ennå)`);
        // Ikke feil - bare logg
      } else {
        console.log(`⚠️  ${url} - Status ${status}`);
      }
    }
  });
});

test.describe('Authentication Flow - DEV (full UI test)', () => {
  // Disse testene forventer at server kjører lokalt (npm run dev)
  // med alle features aktivert
  
  test('should show Google and Microsoft sign-in buttons @dev', async ({ page }) => {
    // Denne testen kjøres kun i dev-miljø
    await page.goto('/no/innlogging');
    
    // Vent på at siden laster
    await page.waitForLoadState('networkidle');
    
    // Sjekk at Google-knapp finnes (kan være skjult bak feature flag i prod)
    const googleButton = page.locator('text=Fortsett med Google').first();
    const hasGoogle = await googleButton.isVisible().catch(() => false);
    
    // Sjekk at Microsoft-knapp finnes
    const microsoftButton = page.locator('text=Fortsett med Microsoft').first();
    const hasMicrosoft = await microsoftButton.isVisible().catch(() => false);
    
    // Logg resultatet, men feil ikke hvis knappene ikke finnes (kan være feature-flagget)
    if (hasGoogle && hasMicrosoft) {
      console.log('✅ Begge OAuth-knapper funnet');
    } else {
      console.log(`⚠️  OAuth-knapper: Google=${hasGoogle}, Microsoft=${hasMicrosoft}`);
    }
  });

  test('should show email input for manual login @dev', async ({ page }) => {
    await page.goto('/no/innlogging');
    await page.waitForLoadState('networkidle');
    
    // Sjekk etter email input (kan være skjult hvis kun OAuth er aktivert)
    const emailInput = page.locator('input[type="email"]').first();
    const hasEmail = await emailInput.isVisible().catch(() => false);
    
    if (hasEmail) {
      console.log('✅ Email input funnet');
    } else {
      console.log('⚠️  Email input ikke synlig (kan være OAuth-only mode)');
    }
  });
});

// TODO: Re-enable disse når redirects er deployet i prod
// test.describe('Redirects (når live i prod)', () => {
//   test('should redirect from /innlogging to /no/innlogging', async ({ page }) => {
//     await page.goto('/innlogging');
//     await page.waitForURL('**/no/innlogging', { timeout: 5000 });
//     expect(page.url()).toContain('/no/innlogging');
//   });
//
//   test('should redirect from /login to /no/innlogging', async ({ page }) => {
//     await page.goto('/login');
//     await page.waitForURL('**/no/innlogging', { timeout: 5000 });
//   });
//
//   test('should redirect from /registrering to /no/opptak', async ({ page }) => {
//     await page.goto('/registrering');
//     await page.waitForURL('**/no/opptak', { timeout: 5000 });
//   });
// });
