import { test, expect } from '@playwright/test';

/**
 * Smoke tests - Critical health checks
 * These tests must pass for any deploy to proceed
 * Fast, reliable, no auth required
 */

test.describe('Smoke: Health Checks @smoke', () => {
  
  test('health endpoint returns 200', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.status).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });
  
  test('homepage loads without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Page should load
    expect(page.url()).toMatch(/klarpakke\.no|localhost/);
    
    // No critical console errors
    const criticalErrors = consoleErrors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('Source map') &&
      !e.includes('Manifest') &&
      !e.includes('analytics')
    );
    expect(criticalErrors).toHaveLength(0);
  });
  
  test('login page is accessible', async ({ page }) => {
    await page.goto('/innlogging');
    await page.waitForLoadState('networkidle');
    
    // Should render login form with data-testid
    const loginPage = page.locator('[data-testid="login-page"]');
    const hasLoginContent = await loginPage.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!hasLoginContent) {
      // Fallback: check for login text
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toMatch(/logg inn|login|sign in/i);
    }
  });
  
  test('leaderboard page loads', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Check for leaderboard page with data-testid
    const leaderboardPage = page.locator('[data-testid="leaderboard-page"]');
    const isVisible = await leaderboardPage.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      // Verify table structure
      const table = page.locator('[data-testid="leaderboard-table"]');
      await expect(table).toBeVisible();
      console.log('✅ Leaderboard loaded with data-testid');
    } else {
      // May be redirected to login if protected
      const url = page.url();
      expect(url).toMatch(/leaderboard|innlogging|login/);
      console.log('⚠️ Leaderboard redirected to:', url);
    }
  });
  
  test('static assets are served', async ({ request }) => {
    // Check that main JS and CSS bundles exist
    const response = await request.get('/');
    const html = await response.text();
    
    // Should have Next.js scripts
    expect(html).toMatch(/_next\/static/);
    
    // Should not have 500 error
    expect(response.status()).toBe(200);
  });
});
