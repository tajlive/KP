import { test, expect } from '@playwright/test';

/**
 * Smoke tests — verifies critical pages load correctly.
 * Run against local dev server (default) or prod via TEST_BASE_URL.
 */

const CRITICAL_PAGES = [
  { path: '/no', name: 'Forside (NO)' },
  { path: '/en', name: 'Forside (EN)' },
  { path: '/no/priser', name: 'Priser' },
  { path: '/no/innlogging', name: 'Innlogging' },
  { path: '/no/kurs', name: 'Kurs' },
  { path: '/no/om-oss', name: 'Om oss' },
  { path: '/no/kontakt', name: 'Kontakt' },
  { path: '/no/personvern', name: 'Personvern' },
  { path: '/no/vilkar', name: 'Vilkår' },
];

const PROTECTED_PAGES = [
  { path: '/no/dashboard', name: 'Dashboard' },
  { path: '/no/dashboard/auto-trade', name: 'Auto-trade' },
  { path: '/no/dashboard/settings', name: 'Innstillinger' },
];

test.describe('Smoke: Public pages load', () => {
  for (const { path, name } of CRITICAL_PAGES) {
    test(`${name} (${path}) returns 200`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
    });
  }
});

test.describe('Smoke: Protected pages redirect to login', () => {
  for (const { path, name } of PROTECTED_PAGES) {
    test(`${name} (${path}) redirects unauthenticated user`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      const status = response?.status();
      const url = page.url();
      // Should either redirect to login or return 200 (middleware redirect)
      expect(status === 200 || status === 302 || status === 307).toBeTruthy();
      if (status === 200) {
        expect(url).toContain('innlogging');
      }
    });
  }
});

test.describe('Smoke: API health', () => {
  test('/api/status returns OK', async ({ request }) => {
    const response = await request.get('/api/status');
    expect(response.status()).toBe(200);
  });
});

test.describe('Smoke: SEO essentials', () => {
  test('robots.txt is accessible', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
  });

  test('sitemap.xml is accessible', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
  });
});
