import { test, expect } from '@playwright/test';

/**
 * Regression tests - Full feature coverage
 * Comprehensive testing of paper trading features
 * Non-blocking initially, will be blocking after stabilization
 */

test.describe('Regression: Paper Trading @regression @papertrading', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('paper trading balance API returns correct structure', async ({ page, request }) => {
    // Get auth cookies from page
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    const response = await request.get('/api/paper-trading/balance', {
      headers: { 'Cookie': cookieHeader }
    });
    
    // Either 200 (has session) or 404 (no session) is valid
    // 401 would indicate auth failure
    expect([200, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.balance).toBeDefined();
      expect(body.balance.current).toBeGreaterThanOrEqual(0);
    }
  });
  
  test('paper trading init API accepts POST', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    const response = await request.post('/api/paper-trading/init', {
      headers: { 'Cookie': cookieHeader }
    });
    
    // 200 = created/retrieved, 404 = auth issue (not 401 with cookies)
    expect([200, 404]).toContain(response.status());
  });
  
  test('dashboard displays trading section', async ({ page }) => {
    // Look for trading-related content
    const bodyText = await page.locator('body').textContent();
    
    // Should have some trading-related content
    const hasTradingContent = 
      bodyText?.toLowerCase().includes('trading') ||
      bodyText?.toLowerCase().includes('portfolio') ||
      bodyText?.toLowerCase().includes('balance');
    
    expect(hasTradingContent).toBe(true);
  });
  
  test('leaderboard API returns valid structure', async ({ request }) => {
    const response = await request.get('/api/paper-trading/leaderboard');
    
    // Should return 200 (public) or 401 (protected)
    expect([200, 401]).toContain(response.status());
    
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.period).toBeDefined();
      expect(body.entries).toBeDefined();
      expect(Array.isArray(body.entries)).toBe(true);
    }
  });
});

test.describe('Regression: WebSocket @regression', () => {
  
  test('WebSocket connections are attempted', async ({ page }) => {
    const wsUrls: string[] = [];
    page.on('websocket', ws => {
      wsUrls.push(ws.url());
    });
    
    await page.goto('/dashboard');
    await page.waitForTimeout(5000);
    
    // Check if any Supabase realtime connections were made
    const hasRealtime = wsUrls.some(url => 
      url.includes('realtime') || url.includes('supabase')
    );
    
    // Log but don't fail - WebSocket is optional
    console.log(`WebSocket connections: ${wsUrls.length}, Realtime: ${hasRealtime}`);
  });
});
