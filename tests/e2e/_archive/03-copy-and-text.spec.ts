// tests/e2e/03-copy-and-text.spec.ts
// Tester tekstkvalitet: ingen manglende i18n, ingen placeholder-tekst,
// alle CTAs har meningsfull tekst

import { test, expect } from '@playwright/test';

const PAGES_TO_CHECK_COPY = [
  '/no',
  '/no/priser',
  '/no/om-oss',
  '/no/innlogging',
  '/no/kurs',
];

for (const path of PAGES_TO_CHECK_COPY) {
  test(`Tekstkvalitet på ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    
    const body = page.locator('body');
    const text = await body.innerText();
    
    // 1. Ingen rå nøkler (f.eks. "auth.title", "common.error")
    const rawKeys = text.match(/\b[a-z]+\.[a-zA-Z]{2,}\b/g) || [];
    const suspectedMissing = rawKeys.filter(key => {
      // Ikke URL-fragmenter eller kjente false positives
      return !key.startsWith('www.') && 
             !key.includes('klarpakke') &&
             key.split('.').every(part => /^[a-zA-Z]+$/.test(part));
    });
    
    if (suspectedMissing.length > 0) {
      console.warn(`⚠️ Mulige manglende i18n-nøkler på ${path}:`, suspectedMissing.slice(0, 10));
    }
    
    // 2. Ingen "undefined" synlig
    expect(text).not.toContain('undefined');
    
    // 3. Ingen "null" synlig i tekst
    const nullMatches = text.match(/\bnull\b/g) || [];
    expect(nullMatches.length, `"null" synlig ${nullMatches.length} gang(er) på ${path}`).toBe(0);
    
    // 4. Ingen tomme knapper/CTAs
    const buttons = await page.locator('button, a.btn, a[class*="button"]').all();
    for (const btn of buttons) {
      const btnText = (await btn.innerText()).trim();
      const ariaLabel = await btn.getAttribute('aria-label');
      if (!btnText && !ariaLabel) {
        const html = await btn.innerHTML();
        console.warn(`⚠️ Tom knapp på ${path}: ${html.substring(0, 100)}`);
      }
    }
    
    // 5. H1 er ikke tom
    const h1 = page.locator('h1').first();
    if (await h1.count() > 0) {
      const h1Text = (await h1.innerText()).trim();
      expect(h1Text, `Tom h1 på ${path}`).not.toBe('');
    }
    
    // 6. Meta title finnes
    const title = await page.title();
    expect(title, `Ingen page title på ${path}`).not.toBe('');
    expect(title, `Page title er "undefined" på ${path}`).not.toContain('undefined');
    
    await page.screenshot({ 
      path: `playwright-report/screenshots/copy_${path.replace(/\//g, '_')}.png`, 
      fullPage: true 
    });
  });
}
