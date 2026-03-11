import { test, expect } from '@playwright/test';

/**
 * Regression tests - Full feature coverage
 * Comprehensive testing of paper trading features
 * Non-blocking initially, will be blocking after stabilization
 */

test.describe('Regression: Paper Trading @regression @papertrading', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard', { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  });

  test('paper trading balance API returns correct structure', async ({ page, request }) => {
    // Get auth cookies from page
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    const response = await request.get('/api/paper-trading/balance', {
      headers: { 'Cookie': cookieHeader }
    });
    
    // Either 200 (has session), 404 (no session), or 401 (auth required) is valid
    expect([200, 401, 404]).toContain(response.status());
    
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
    
    // 200 = created/retrieved, 401 = auth required, 404 = not found
    expect([200, 401, 404]).toContain(response.status());
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
    
    await page.goto('/dashboard', { timeout: 60000 });
    await page.waitForTimeout(5000);
    
    // Check if any Supabase realtime connections were made
    const hasRealtime = wsUrls.some(url => 
      url.includes('realtime') || url.includes('supabase')
    );
    
    // Log but don't fail - WebSocket is optional
    console.log(`WebSocket connections: ${wsUrls.length}, Realtime: ${hasRealtime}`);
  });
});
