import { test, expect } from '@playwright/test';

/**
 * AUTH PROTECTION TESTS
 * 
 * Disse testene VILLE FANGET OPP infinite redirect loop buggen.
 * De tester client-side behavior, ikke bare HTTP status.
 * 
 * KJØRES MOT: produksjons-URL konfigurert i playwright.config.ts
 */

test.describe('🔐 Redirect Loop Detection', () => {
  
  test('innlogging-siden skal IKKE redirecte til seg selv', async ({ page }) => {
    const redirectUrls: string[] = [];
    
    // Spor alle navigasjoner
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        redirectUrls.push(frame.url());
      }
    });
    
    await page.goto('/no/innlogging');
    
    // Vent 4 sekunder for å detektere loop
    await page.waitForTimeout(4000);
    
    // Sjekk at URL ikke har endret seg etter lasting
    const finalUrl = page.url();
    expect(finalUrl).toContain('/no/innlogging');
    
    // Sjekk at vi ikke har 3+ navigasjoner (tegn på loop)
    const innloggingVisits = redirectUrls.filter(u => u.includes('/no/innlogging')).length;
    expect(innloggingVisits).toBeLessThanOrEqual(2); // Maks 1 initial + 1 evt. redirect dit
    
    // Eksplisitt feil-melding
    if (innloggingVisits > 2) {
      throw new Error(`🚨 INFINITE LOOP DETEKTERT: /no/innlogging ble besøkt ${innloggingVisits} ganger!
      Alle URL-er i sekvens: ${redirectUrls.join(' → ')}`);
    }
  });
  
  test('beskyttet rute skal redirecte uautentisert bruker til innlogging (kun EN gang)', async ({ page }) => {
    const redirectUrls: string[] = [];
    
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        redirectUrls.push(frame.url());
      }
    });
    
    // Gå til beskyttet side uten å være logget inn
    await page.goto('/no/dashboard');
    
    // Vent på redirect
    await page.waitForTimeout(4000);
    
    // Skal ende opp på innlogging
    expect(page.url()).toContain('/no/innlogging');
    
    // Skal KUN ha redirectet EN gang (ikke loope)
    const innloggingCount = redirectUrls.filter(u => u.includes('innlogging')).length;
    
    if (innloggingCount > 2) {
      throw new Error(`🚨 REDIRECT LOOP: Dashboard redirectet til innlogging ${innloggingCount} ganger!
      Sekvens: ${redirectUrls.join(' → ')}`);
    }
  });
  
  test('URL skal ikke endre seg 3 sekunder etter landing på innlogging', async ({ page }) => {
    await page.goto('/no/innlogging');
    
    // Vent til siden er stabil
    await page.waitForLoadState('networkidle');
    
    const urlEtterLasting = page.url();
    
    // Vent 3 sekunder til
    await page.waitForTimeout(3000);
    
    const urlEtterVenting = page.url();
    
    expect(urlEtterVenting).toBe(urlEtterLasting);
  });
  
  test('public ruter skal ALDRI redirecte til innlogging', async ({ page }) => {
    const publicRoutes = [
      '/no',
      '/no/priser',
    ];
    
    for (const route of publicRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const finalUrl = page.url();
      
      expect(
        finalUrl,
        `❌ Public rute ${route} ble redirectet til ${finalUrl} - skal ALDRI skje!`
      ).not.toContain('/innlogging');
    }
  });
});

test.describe('🖼️ Favicon', () => {
  test('favicon.ico skal returnere 200 med korrekt content-type', async ({ request }) => {
    const response = await request.get('/favicon.ico');
    
    expect(response.status()).toBe(200);
    
    const contentType = response.headers()['content-type'];
    expect(
      contentType,
      `Favicon skal være image/x-icon eller image/vnd.microsoft.icon, fikk: ${contentType}`
    ).toMatch(/image\/(x-icon|vnd\.microsoft\.icon|ico)/);
    
    const body = await response.body();
    expect(body.length).toBeGreaterThan(1000); // Ikke en placeholder på 1 byte
  });
  
  test('favicon skal vises i HTML head', async ({ page }) => {
    await page.goto('/no');
    
    const faviconLink = page.locator('link[rel*="icon"]').first();
    const hasFavicon = await faviconLink.count() > 0;
    
    if (!hasFavicon) {
      // Next.js legger til favicon automatisk fra app/favicon.ico
      // Sjekk at /favicon.ico svarer
      const response = await page.request.get('/favicon.ico');
      expect(response.status()).toBe(200);
    }
  });
});
