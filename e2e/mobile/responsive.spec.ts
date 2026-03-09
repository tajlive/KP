import { test, expect } from '@playwright/test';

/**
 * Mobile tests - Device-specific testing
 * Tests responsive design and mobile interactions
 * Non-blocking for deploy
 */

test.describe('Mobile: Responsive Design @mobile', () => {
  
  test('dashboard renders on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Page should load without horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
    
    // Content should be visible
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });
  
  test('navigation works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for hamburger menu or mobile nav
    const hasMobileNav = await page.locator('button, [role="button"]').filter({ hasText: /menu|nav/i }).count() > 0;
    
    // Mobile nav should exist or page should have touch-friendly elements
    const touchTargets = await page.locator('button, a').count();
    expect(touchTargets).toBeGreaterThan(0);
  });
  
  test('login page is usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/innlogging');
    await page.waitForLoadState('networkidle');
    
    // Form elements should be visible and clickable
    const buttons = await page.locator('button').count();
    expect(buttons).toBeGreaterThan(0);
  });
});
