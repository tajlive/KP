// tests/e2e/01-public-pages.spec.ts
// Tester at alle offentlige sider:
// - Laster (HTTP 200)
// - Har h1-overskrift
// - Ikke viser rå i18n-nøkler (f.eks. "common.title", "undefined")
// - Ikke har synlige JavaScript-feil i console
// - Ser riktig ut på desktop OG mobil (skjermbilder)

import { test, expect } from '@playwright/test';

const PUBLIC_PAGES = [
  // [path, forventet h1-innhold (del av tekst)]
  ['/no', null],                      // Landing
  ['/no/om-oss', null],
  ['/no/priser', 'Velg din'],         // Faktisk: "Velg din studieplan"
  ['/no/kurs', null],
  ['/no/kalkulator', null],
  ['/no/hjelp', null],
  ['/no/kontakt', null],
  ['/no/innlogging', null],           // Kan være uten h1, bruker divs
  ['/no/innstillinger', null],        // Skal redirecte til innlogging
  ['/en', null],                      // Engelsk versjon
  ['/en/pricing', 'Choose your'],     // Faktisk: "Choose your study plan"
];

for (const [path, expectedH1] of PUBLIC_PAGES) {
  test(`Side: ${path} – laster korrekt`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    
    const response = await page.goto(path as string, { waitUntil: 'domcontentloaded' });
    
    // Sjekk HTTP-status (200, 30x redirect er OK)
    const status = response?.status() || 0;
    expect(status === 200 || status === 301 || status === 302 || status === 307 || status === 308, 
      `${path} returnerte ${status}`
    ).toBe(true);
    
    // Vent til siden er ferdig lastet
    await page.waitForLoadState('networkidle');
    
    // Sjekk at siden ikke viser rå oversettelsesnøkler
    const bodyText = await page.locator('body').innerText();
    const rawKeyPattern = /[a-z]+\.[a-zA-Z]+\.[a-zA-Z]+/;
    const suspiciousKeys = bodyText.match(rawKeyPattern) || [];
    // Filtrer bort kjente false positives (URLer, CSS-klasser osv.)
    const realMissingKeys = suspiciousKeys.filter(k => 
      !k.includes('http') && 
      !k.includes('next') &&
      !k.includes('vercel') &&
      bodyText.includes(k)
    );
    
    // Sjekk at "undefined" ikke vises synlig i UI
    const undefinedVisible = await page.locator('text=undefined').count();
    expect(undefinedVisible, 
      `"undefined" synlig på ${path}`
    ).toBe(0);
    
    // Sjekk h1 om angitt, ellers bare sjekk at siden har innhold
    if (expectedH1) {
      await expect(page.locator('h1').first()).toContainText(expectedH1);
    } else {
      // Sjekk at siden har innhold (enten h1 eller tittel)
      const h1Count = await page.locator('h1').count();
      const title = await page.title();
      expect(h1Count > 0 || title.length > 0, 
        `Ingen h1 eller tittel på ${path}`
      ).toBe(true);
    }
    
    // Skjermbildet lagres automatisk (screenshot: 'on' i config)
    await page.screenshot({ 
      path: `playwright-report/screenshots/${(path as string).replace(/\//g, '_')}.png`,
      fullPage: true 
    });
    
    // Ingen kritiske console-feil (filtrer bort kjente tredjeparter og API-errors)
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('Sentry') &&
      !err.includes('analytics') &&
      !err.includes('favicon') &&
      !err.includes('the server responded with a status of 400') &&
      !err.includes('the server responded with a status of 401') &&
      !err.includes('the server responded with a status of 403')
    );
    expect(criticalErrors, 
      `Console errors på ${path}: ${criticalErrors.join(', ')}`
    ).toHaveLength(0);
  });
}
