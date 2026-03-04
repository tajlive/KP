import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'https://www.klarpakke.no';

test.describe('Cloudflare Pages Routing', () => {
  test('Root redirects to /no/', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveURL(new RegExp(`/no/$`));
  });

  test('All locales load correctly', async ({ page }) => {
    const locales = ['no', 'en'];
    
    for (const locale of locales) {
      await page.goto(`${BASE_URL}/${locale}/`);
      await expect(page).toHaveURL(new RegExp(`/${locale}/`));
      // Check that page content loaded
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('404 page works correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/no/this-page-does-not-exist`);
    await expect(page.locator('text=404')).toBeVisible();
    await expect(page.locator('text=forsiden')).toBeVisible();
  });

  test('Dashboard requires auth redirect', async ({ page }) => {
    await page.goto(`${BASE_URL}/no/dashboard`);
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('Auto-Trading AI page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/no/auto-trading-ai`);
    await expect(page.locator('h1, h2')).toBeVisible();
  });

  test('Paper Trading page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/no/paper-trading`);
    await expect(page.locator('h1, h2')).toBeVisible();
  });
});

test.describe('Security Headers', () => {
  test('Has HSTS header', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/no/`);
    const headers = response?.headers();
    expect(headers?.['strict-transport-security']).toBeDefined();
    expect(headers?.['strict-transport-security']).toContain('max-age=31536000');
  });

  test('Has X-Frame-Options', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    const headers = response?.headers();
    expect(headers?.['x-frame-options']).toBe('DENY');
  });

  test('Has X-Content-Type-Options', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    const headers = response?.headers();
    expect(headers?.['x-content-type-options']).toBe('nosniff');
  });

  test('Has Referrer-Policy', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    const headers = response?.headers();
    expect(headers?.['referrer-policy']).toBeDefined();
  });
});

test.describe('Performance', () => {
  test('Page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/no/`);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // 5 seconds max
  });

  test('Core Web Vitals baseline', async ({ page }) => {
    await page.goto(`${BASE_URL}/no/`);
    
    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        ttfb: nav?.responseStart - nav?.requestStart,
        domContentLoaded: nav?.domContentLoadedEventEnd - nav?.startTime,
        loadComplete: nav?.loadEventEnd - nav?.startTime,
      };
    });

    expect(metrics.ttfb).toBeLessThan(1000); // TTFB < 1s
    expect(metrics.domContentLoaded).toBeLessThan(3000); // DCL < 3s
  });
});

test.describe('SEO', () => {
  test('Sitemap is accessible', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/sitemap.xml`);
    expect(response?.status()).toBe(200);
    expect(await page.content()).toContain('<urlset');
  });

  test('Robots.txt is accessible', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/robots.txt`);
    expect(response?.status()).toBe(200);
    expect(await page.content()).toContain('User-agent');
  });

  test('Homepage has proper meta tags', async ({ page }) => {
    await page.goto(`${BASE_URL}/no/`);
    
    const title = await page.title();
    expect(title).toContain('Klarpakke');
    
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
  });
});
