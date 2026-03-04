// tests/e2e/06-responsive.spec.ts
// Sjekker at innhold ikke er klippet/overflytet på mobil

import { test, expect } from '@playwright/test';

test.describe('Responsivt design', () => {
  
  test('Landing page er ikke klippet på mobil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/no');
    await page.waitForLoadState('networkidle');
    
    // Sjekk horisontalt overflow
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    
    expect(hasOverflow, 
      'Siden har horisontal scroll på mobil (innhold klippes)'
    ).toBe(false);
    
    await page.screenshot({ 
      path: 'playwright-report/screenshots/responsive_mobile_landing.png',
      fullPage: true 
    });
  });
  
  test('Tekst er lesbar på alle breakpoints', async ({ page }) => {
    const breakpoints = [375, 768, 1440];
    
    for (const width of breakpoints) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/no');
      await page.waitForLoadState('networkidle');
      
      // Sjekk at h1 er synlig og ikke for liten
      const h1 = page.locator('h1').first();
      if (await h1.count() > 0) {
        await expect(h1).toBeVisible();
        
        const fontSize = await h1.evaluate(el => {
          if (typeof window !== 'undefined') {
            return parseFloat(window.getComputedStyle(el).fontSize);
          }
          return 0;
        });
        expect(fontSize, 
          `H1 font-size (${fontSize}px) er for liten på ${width}px breakpoint`
        ).toBeGreaterThan(16);
      }
      
      await page.screenshot({ 
        path: `playwright-report/screenshots/responsive_${width}px.png`,
        fullPage: true 
      });
    }
  });
});
