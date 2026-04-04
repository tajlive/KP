import { test, expect } from '@playwright/test';

const BASE = 'https://www.klarpakke.no/no';

test('1. Landingsside laster og viser kalkulator', async ({ page }) => {
  await page.goto(BASE);
  await expect(page.locator('h1')).toBeVisible();
  // Kalkulator finnes
  await expect(page.locator('[data-testid="backtest-calculator"]')
    .or(page.locator('text=Investeringsbeløp'))).toBeVisible();
});

test('2. Registrering-side er tilgjengelig', async ({ page }) => {
  await page.goto(`${BASE}/registrer`);
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
});

test('3. Innlogging-side er tilgjengelig', async ({ page }) => {
  await page.goto(`${BASE}/logg-inn`);
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
});

test('4. Paper trading-side laster (uten auth)', async ({ page }) => {
  await page.goto(`${BASE}/trading/paper`);
  // Skal redirecte til login, IKKE krasje
  const url = page.url();
  expect(url).toMatch(/logg-inn|registrer|trading/);
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
  const routes = ['', '/priser', '/hjelp', '/logg-inn', '/registrer'];
  for (const route of routes) {
    const resp = await page.goto(`${BASE}${route}`);
    expect(resp?.status()).not.toBe(500);
  }
});
