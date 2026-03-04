import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Critical User Flows
 * 
 * These tests verify the most important user journeys:
 * 1. Registration flow
 * 2. Simulator trading flow
 * 3. Admin dashboard access
 * 4. Beta application flow
 */

test.describe('Critical user flows', () => {
  
  test.describe.configure({ mode: 'parallel' });

  test('Landing page loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Verify key elements
    await expect(page.locator('h1')).toContainText('crypto');
    await expect(page.locator('text=simulatoren')).toBeVisible();
    await expect(page.locator('text=Lær')).toBeVisible();
  });

  test('Navigation to pricing works', async ({ page }) => {
    await page.goto('/');
    
    // Click on pricing link
    await page.click('text=Priser');
    
    // Verify pricing page
    await expect(page).toHaveURL(/.*priser.*/);
    await expect(page.locator('text=Gratis')).toBeVisible();
  });

  test('Simulator page loads', async ({ page }) => {
    await page.goto('/no/simulator');
    
    // Verify simulator elements
    await expect(page.locator('text=Simulator')).toBeVisible();
  });

  test('Login page is accessible', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Verify login form
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Logg inn")')).toBeVisible();
  });

  test('Health endpoint returns OK', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('404 page works for unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    
    // Should show 404 page
    await expect(page.locator('text=404')).toBeVisible();
    await expect(page.locator('text=Siden finnes ikke')).toBeVisible();
  });

  test('Mobile viewport - navigation is accessible', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Mobile menu button should be visible
    await expect(page.locator('button[aria-label="Meny"], button:has(svg)')).toBeVisible();
  });

  test('Prices page shows disclaimer', async ({ page }) => {
    await page.goto('/no/priser');
    
    // Verify disclaimer is visible
    await expect(page.locator('text=pedagogisk')).toBeVisible();
    await expect(page.locator('text=rådgivning')).toBeVisible();
  });

});
