import { test, expect } from '@playwright/test';

// Test suite for 404 debugging

test.describe('404 Diagnosis - /velg-strategi', () => {
  
  test('Direct access with locale /no/velg-strategi', async ({ page }) => {
    const response = await page.goto('https://www.klarpakke.no/no/velg-strategi');
    console.log('Status:', response?.status());
    console.log('URL:', page.url());
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/no-velg-strategi.png', fullPage: true });
    
    expect(response?.status()).toBe(200);
  });

  test('Redirect from /velg-strategi (no locale)', async ({ page }) => {
    const response = await page.goto('https://www.klarpakke.no/velg-strategi');
    console.log('Initial Status:', response?.status());
    console.log('Final URL:', page.url());
    
    await page.screenshot({ path: 'test-results/velg-strategi-redirect.png', fullPage: true });
    
    // Should either redirect (3xx) or serve content (200)
    const status = response?.status() || 0;
    expect([200, 301, 302, 307, 308]).toContain(status);
  });

  test('Check network requests', async ({ page }) => {
    const requests: string[] = [];
    
    page.on('request', request => {
      requests.push(`${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      console.log(`Response: ${response.status()} ${response.url()}`);
    });
    
    await page.goto('https://www.klarpakke.no/velg-strategi');
    
    // Wait a bit for all requests
    await page.waitForTimeout(2000);
    
    console.log('All requests:', requests);
  });

  test('Homepage should work', async ({ page }) => {
    const response = await page.goto('https://www.klarpakke.no');
    console.log('Homepage Status:', response?.status());
    
    await page.screenshot({ path: 'test-results/homepage.png', fullPage: true });
    
    expect(response?.status()).toBe(200);
  });

  test('Dashboard should work (protected)', async ({ page }) => {
    const response = await page.goto('https://www.klarpakke.no/dashboard');
    console.log('Dashboard Status:', response?.status());
    console.log('Dashboard URL:', page.url());
    
    await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true });
  });
});
