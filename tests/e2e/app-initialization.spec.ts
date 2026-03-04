import { test, expect } from '@playwright/test';
import { waitForAppReady, checkConsoleErrors } from '../helpers/test-utils';

test.describe('App Initialization', () => {
  test('should load the application without errors', async ({ page }) => {
    const errors = await checkConsoleErrors(page);

    await page.goto('/');
    await waitForAppReady(page);

    // Check for title or main heading
    const hasTitle = await page.locator('h1, [role="heading"]').first().isVisible();
    expect(hasTitle).toBeTruthy();

    // Verify no critical console errors
    const criticalErrors = errors.filter(e => !e.includes('favicon'));
    expect(criticalErrors.length).toBe(0);
  });

  test('should display main navigation', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    // Check for navigation elements (sidebar or menu)
    const hasNav = await page.locator('nav, aside, button:has-text("Menu")').first().isVisible();
    expect(hasNav).toBeTruthy();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/');
    await waitForAppReady(page);

    // Should still render main container
    const mainContainer = page.locator('.h-screen, #root > div').first();
    await expect(mainContainer).toBeVisible();
  });

  test('should load without network errors', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('requestfailed', request => {
      failedRequests.push(request.url());
    });

    await page.goto('/');
    await waitForAppReady(page);

    // Filter out known optional resources
    const criticalFailures = failedRequests.filter(url =>
      !url.includes('favicon') &&
      !url.includes('analytics') &&
      !url.includes('webflow.io')
    );

    expect(criticalFailures.length).toBe(0);
  });

  test('should render with correct HTML structure', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    // Check for essential HTML elements
    const html = page.locator('html');
    const body = page.locator('body');
    const root = page.locator('#root, [data-reactroot]');

    await expect(html).toBeVisible();
    await expect(body).toBeVisible();
    await expect(root).toBeVisible();
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');

    // Check viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');

    // Check charset
    const charset = await page.locator('meta[charset]').first().getAttribute('charset');
    expect(charset).toBeTruthy();
  });
});
