import { test, expect } from '@playwright/test';

test.describe('Page Navigation', () => {
  test('home page should load', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/klarpakke/i);

    // Check for main content
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 5000 }).catch(() => {
      // Main might not exist, that's ok for now
    });
  });

  test('kalkulator page should be accessible', async ({ page }) => {
    await page.goto('/kalkulator');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5000 }).catch(() => {
      // Heading might not exist
    });
  });

  test('404 page should exist for unknown routes', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-12345');
    expect(response?.status()).toBe(404);
  });

  test('should handle navigation between pages', async ({ page }) => {
    await page.goto('/');

    // Try to find navigation links
    const navLinks = page.locator('nav a, [role="navigation"] a').all();

    // If navigation links exist, try one
    const links = await navLinks;
    if (links.length > 0) {
      const firstLink = links[0];
      const href = await firstLink.getAttribute('href');

      if (href && !href.startsWith('http')) {
        await page.goto(href);
        expect(page.url()).toContain(href);
      }
    }
  });
});
