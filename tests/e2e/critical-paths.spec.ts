import { test, expect } from '@playwright/test';

test.describe('Critical Production Paths', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  test('Course page should not 404', async ({ page }) => {
    const response = await page.goto(`${baseUrl}/no/kurs`);
    expect(response?.status()).not.toBe(404);
    
    // Should see the course page content
    await expect(page.locator('h1')).toContainText(/Kurs|Courses/i);
  });

  test('Login flow should work', async ({ page }) => {
    await page.goto(`${baseUrl}/login`);
    
    // Should redirect to /en/login or /no/login
    await page.waitForURL(/\/(no|en)\/login/);
    
    // Login form should be visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('Dashboard should load or redirect to login', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    // Should redirect to /en/dashboard or /no/dashboard (or login)
    await page.waitForURL(/\/(no|en)\/(dashboard|login)/);
  });

  test('Nested course routes redirect instead of 404', async ({ page }) => {
    const response = await page.goto(
      `${baseUrl}/no/kurs/hvorfor-priser-beveger-seg/leksjon/tilbud-og-etterspørsel`
    );
    
    // Should not be 404
    expect(response?.status()).not.toBe(404);
    
    // Should eventually land on /kurs (redirected)
    const finalUrl = page.url();
    expect(finalUrl).toContain('/kurs');
  });

  test('Landing page should load', async ({ page }) => {
    const response = await page.goto(`${baseUrl}`);
    expect(response?.status()).toBe(200);
    
    // Should have key content
    await expect(page.locator('h1')).toBeVisible();
  });
});
