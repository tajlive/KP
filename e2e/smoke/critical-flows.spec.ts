import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';

test('1. Landingsside laster og viser CTA', async ({ page }) => {
  await page.goto(`${BASE}/no`);
  await expect(page.locator('h1')).toBeVisible();
  // CTA finnes
  await expect(page.locator('button').filter({ hasText: /Kom i gang|Start|Registrer/ }).first()).toBeVisible();
});

test('2. Registrering-side er tilgjengelig', async ({ page }) => {
  await page.goto(`${BASE}/no/register`);
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
});

test('3. Innlogging-side er tilgjengelig', async ({ page }) => {
  await page.goto(`${BASE}/no/login`);
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
});

test('4. Handel-side laster (uten auth)', async ({ page }) => {
  await page.goto(`${BASE}/no/handel`);
  // Skal vise handelsside, IKKE krasje
  await expect(page.locator('h1, h2').first()).toBeVisible();
});

test('5. Priser-side viser abonnementsalternativer', async ({ page }) => {
  await page.goto(`${BASE}/priser`);
  await expect(page.locator('body')).toContainText(/gratis|månedlig|kr|pris/i);
});

test('6. Hjelp-side er tilgjengelig', async ({ page }) => {
  await page.goto(`${BASE}/hjelp`);
  await expect(page.locator('h1')).toBeVisible();
});

test('7. API health returnerer 200', async ({ request }) => {
  const resp = await request.get('https://www.klarpakke.no/api/health');
  expect(resp.status()).toBe(200);
  const body = await resp.json();
  expect(body.status).toBe('healthy');
});

test('8. Ingen 500-feil på noen kritisk side', async ({ page }) => {
  const routes = ['', '/priser', '/hjelp', '/auth/login', '/auth/register'];
  for (const route of routes) {
    const resp = await page.goto(`${BASE}/no${route}`);
    expect(resp?.status()).not.toBe(500);
  }
});
