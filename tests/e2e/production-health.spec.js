import { test, expect } from '@playwright/test';

const LIVE_URL = 'https://klarpakke-c65071.webflow.io';

test.describe('Production Health Check', () => {
  test.use({ retries: 2 });

  test('Site loads successfully', async ({ page }) => {
    const response = await page.goto(LIVE_URL);
    expect(response.status()).toBe(200);
  });

  test('Custom Code loaded', async ({ page }) => {
    await page.goto(LIVE_URL);
    
    const config = await page.evaluate(() => {
      return {
        exists: !!window.KLARPAKKE_CONFIG,
        url: window.KLARPAKKE_CONFIG?.SUPABASE_URL,
        hasKey: !!window.KLARPAKKE_CONFIG?.SUPABASE_ANON_KEY,
        clientExists: typeof window.supabase !== 'undefined'
      };
    });

    expect(config.exists).toBeTruthy();
    expect(config.url).toContain('supabase.co');
  });

  test('jsDelivr script loads', async ({ page }) => {
    await page.goto(LIVE_URL);
    
    const scriptLoaded = await page.evaluate(() => {
      const script = document.querySelector('script[src*="jsdelivr"]');
      return !!script;
    });

    expect(scriptLoaded).toBeTruthy();
  });
});
