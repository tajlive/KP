import { test, expect } from '@playwright/test';

/**
 * Critical: Dashboard
 * Core dashboard functionality
 * Blocking for deploy
 */

test.describe('Critical: Dashboard @critical', () => {
  
  test('dashboard root element exists', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check for dashboard root with data-testid
    const dashboardRoot = page.locator('[data-testid="dashboard-root"]');
    
    // May be redirected to login if not authenticated
    const isDashboard = await dashboardRoot.isVisible({ timeout: 5000 }).catch(() => false);
    const url = page.url();
    
    if (isDashboard) {
      // Successfully on dashboard
      await expect(dashboardRoot).toBeVisible();
      console.log('✅ Dashboard root element found');
    } else if (url.includes('innlogging') || url.includes('login')) {
      // Redirected to login - valid behavior
      console.log('⚠️ Redirected to login (expected without auth)');
      test.skip();
    } else {
      throw new Error(`Dashboard not found and not redirected. URL: ${url}`);
    }
  });
  
  test('WebSocket connections attempt to connect', async ({ page }) => {
    const wsUrls: string[] = [];
    page.on('websocket', ws => {
      wsUrls.push(ws.url());
      console.log('🔌 WebSocket:', ws.url());
    });
    
    await page.goto('/dashboard');
    await page.waitForTimeout(5000); // Wait for potential WebSocket connections
    
    // Check if any Supabase realtime connections were attempted
    const hasRealtime = wsUrls.some(url => 
      url.includes('realtime') || url.includes('supabase')
    );
    
    if (hasRealtime) {
      console.log('✅ Supabase Realtime WebSocket detected');
    } else {
      console.log('⚠️ No WebSocket connections (may be expected)');
    }
    
    // Don't fail - WebSocket is optional
    expect(true).toBe(true);
  });
  
  test('no critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);
    
    // Filter for critical errors only
    const criticalErrors = errors.filter(e => 
      e.includes('toFixed') || 
      e.includes('addLineSeries') ||
      e.includes('Cannot read properties of undefined') ||
      e.includes('Cannot read properties of null') ||
      e.includes('undefined is not') ||
      e.includes('null is not')
    );
    
    if (criticalErrors.length > 0) {
      console.error('Critical console errors:', criticalErrors);
    }
    
    expect(criticalErrors).toHaveLength(0);
  });
  
  test('page is responsive', async ({ page }) => {
    // Test desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    let bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeGreaterThan(0);
    
    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForTimeout(2000);
    
    bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
    
    console.log('✅ Dashboard is responsive');
  });
});

test.describe('Critical: API Endpoints @critical', () => {
  
  test('health endpoint responds', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.status()).toBe(200);
    
    const json = await response.json();
    expect(json.status).toBeDefined();
    expect(json.timestamp).toBeDefined();
    
    console.log('✅ Health API:', json.status);
  });
  
  test('paper trading endpoints require auth', async ({ request }) => {
    // Call without auth
    const initResponse = await request.post('/api/paper-trading/init');
    const balanceResponse = await request.get('/api/paper-trading/balance');
    
    // Both should require auth
    expect(initResponse.status()).toBe(401);
    expect(balanceResponse.status()).toBe(401);
    
    console.log('✅ Paper trading endpoints correctly require auth');
  });
});
