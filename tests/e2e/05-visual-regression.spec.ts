// tests/e2e/05-visual-regression.spec.ts
// Tar fullside-skjermbilder av alle viktige sider
// Disse brukes som baseline for fremtidige sammenligninger

import { test, expect } from '@playwright/test';

const VISUAL_PAGES = [
  { path: '/no', name: 'landing_no' },
  { path: '/en', name: 'landing_en' },
  { path: '/no/priser', name: 'pricing_no' },
  { path: '/no/om-oss', name: 'about_no' },
  { path: '/no/innlogging', name: 'login_no' },
  { path: '/no/kurs', name: 'courses_no' },
  { path: '/no/kalkulator', name: 'calculator_no' },
  { path: '/no/hjelp', name: 'help_no' },
];

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

for (const { path, name } of VISUAL_PAGES) {
  for (const viewport of VIEWPORTS) {
    test(`Visuell: ${name} – ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      
      // Vent på at animasjoner er ferdig
      await page.waitForTimeout(1000);
      
      // Skjul dynamisk innhold (priser, datoer, tellere)
      await page.addStyleTag({
        content: `
          [data-testid*="price"], [class*="countdown"], 
          [class*="animation"], .loading-spinner { 
            visibility: hidden !important; 
          }
        `
      });
      
      // Ta fullside screenshot
      await page.screenshot({
        path: `playwright-report/screenshots/visual_${name}_${viewport.name}.png`,
        fullPage: true,
      });
      
      // Sjekk at siden har substansielt innhold (ikke tom/feil)
      const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
      expect(bodyHeight, `${path} ser ut til å være en tom side`).toBeGreaterThan(200);
    });
  }
}
