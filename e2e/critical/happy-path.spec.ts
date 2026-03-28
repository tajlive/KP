import { test, expect } from '@playwright/test';

/**
 * Happy path E2E — Klarpakke
 * Tester kjerneflyt: dashboard -> paper-trade -> auto-trade
 *
 * Bruker pre-authenticated state fra auth.setup.ts.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Klarpakke Happy Path', () => {
  test('dashboard laster', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(
      page.getByTestId('dashboard-home-overview')
    ).toBeVisible({ timeout: 5000 });
  });

  test('paper-trade side laster og viser konfig-kort', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/trade?mode=paper`);
    await expect(page).toHaveURL(/\/dashboard\/trade/, { timeout: 10000 });
    await expect(
      page.locator('text=Lekepenger').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('auto-trade side: robot-strip og konfig-kort vises', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/auto-trade`);
    await expect(page).toHaveURL(/\/dashboard\/auto-trade/, { timeout: 10000 });
    await expect(
      page.locator('text=Auto-Trading').first()
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText('Risikoniv\u00e5')
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText('Lagre innstillinger')
    ).toBeVisible({ timeout: 5000 });
  });

  test('scroll fungerer pa mobil (iOS-fix)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    const bodyOverflow = await page.evaluate(() => {
      return window.getComputedStyle(document.body).overflow;
    });
    expect(bodyOverflow).not.toBe('hidden');
  });
});
