import { test, expect } from '@playwright/test';
import { testData } from '../helpers/test-utils';

test.describe('🔍 Login Debugging', () => {
  
  test('attempt login and capture debug info', async ({ page }) => {
    const consoleLogs: string[] = [];
    const networkErrors: string[] = [];
    
    // Capture console logs
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(text);
      console.log(text);
    });
    
    // Capture network errors
    page.on('response', response => {
      if (response.status() >= 400) {
        const error = `${response.status()} ${response.url()}`;
        networkErrors.push(error);
        console.error('Network error:', error);
      }
    });

    // Go to login page
    console.log('Navigating to login page...');
    await page.goto('/no/innlogging');
    
    // Wait for form to be ready
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill in credentials
    console.log('Filling credentials...');
    await page.fill('input[type="email"]', testData.user.email);
    await page.fill('input[type="password"]', testData.user.password);
    
    // Take screenshot before submit
    await page.screenshot({ path: 'test-results/before-login.png' });
    
    // Submit form
    console.log('Submitting form...');
    await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/auth/v1/token') || 
        response.url().includes('/no/dashboard'),
        { timeout: 10000 }
      ).catch(() => null),
      page.click('button[type="submit"]')
    ]);
    
    // Wait for navigation or error
    await page.waitForTimeout(3000);
    
    // Take screenshot after
    await page.screenshot({ path: 'test-results/after-login.png' });
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check for error messages
    const errorMessage = await page.locator('text=/feil|error|ugyldig|invalid/i').first().textContent().catch(() => null);
    if (errorMessage) {
      console.error('Error message found:', errorMessage);
    }
    
    // Log summary
    console.log('\n=== DEBUG SUMMARY ===');
    console.log('Console logs:', consoleLogs.length);
    console.log('Network errors:', networkErrors.length);
    console.log('Final URL:', currentUrl);
    
    // Don't fail the test - we just want to see what happens
    expect(true).toBe(true);
  });
  
  test('check if test user exists via API', async ({ request }) => {
    // Try to check if we can access auth endpoints
    const response = await request.get('/api/auth/session');
    console.log('Session API status:', response.status());
    
    const body = await response.json().catch(() => ({}));
    console.log('Session data:', body);
    
    expect(response.status()).toBeLessThan(500);
  });
});
