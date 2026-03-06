import { test, expect } from '@playwright/test';

test.describe('🔍 Login Debug (Complete)', () => {
  
  test('debug login flow step by step', async ({ page }) => {
    const logs: string[] = [];
    
    // Capture all console messages
    page.on('console', msg => {
      const log = `[${msg.type()}] ${msg.text()}`;
      logs.push(log);
      console.log(log);
    });
    
    // Capture all network requests
    page.on('request', request => {
      if (request.url().includes('supabase') || request.url().includes('auth')) {
        console.log('📡 Request:', request.method(), request.url());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('supabase') || response.url().includes('auth')) {
        console.log('📡 Response:', response.status(), response.url());
      }
    });

    console.log('\n=== STEP 1: Navigate to login page ===');
    const response = await page.goto('/no/innlogging');
    console.log('Page load status:', response?.status());
    console.log('Current URL:', page.url());
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/01-login-page.png' });
    
    console.log('\n=== STEP 2: Check form elements ===');
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    console.log('Email input visible:', await emailInput.isVisible().catch(() => false));
    console.log('Password input visible:', await passwordInput.isVisible().catch(() => false));
    console.log('Submit button visible:', await submitButton.isVisible().catch(() => false));
    
    console.log('\n=== STEP 3: Fill credentials ===');
    console.log('Using email: tom@klarpakke.no');
    console.log('(Password will be read from TEST_USER_PASSWORD env var or use default)');
    
    await emailInput.fill('tom@klarpakke.no');
    const password = process.env.TEST_USER_PASSWORD || 'DITT_PASSORD_HER';
    await passwordInput.fill(password);
    
    console.log('✅ Credentials filled');
    await page.screenshot({ path: 'test-results/02-credentials-filled.png' });
    
    console.log('\n=== STEP 4: Submit form ===');
    
    // Submit and wait for response
    const [submitResponse] = await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('token') || resp.url().includes('session'),
        { timeout: 10000 }
      ).catch(() => null),
      submitButton.click()
    ]);
    
    if (submitResponse) {
      console.log('Submit response status:', submitResponse.status());
      const body = await submitResponse.json().catch(() => ({}));
      if (body.error) {
        console.error('❌ Auth error:', body.error);
        console.error('Error description:', body.error_description);
      }
    }
    
    console.log('\n=== STEP 5: Wait and check result ===');
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);
    
    // Check for error messages
    const errorLocator = page.locator('text=/feil|error|ugyldig|invalid/i').first();
    const errorText = await errorLocator.textContent().catch(() => null);
    if (errorText) {
      console.error('❌ Error message on page:', errorText);
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/03-after-submit.png' });
    
    console.log('\n=== SUMMARY ===');
    console.log('Started at:', '/no/innlogging');
    console.log('Ended at:', finalUrl);
    console.log('Success:', finalUrl.includes('/dashboard') ? '✅ YES' : '❌ NO');
    console.log('Console logs captured:', logs.length);
    
    // Don't fail the test - we just want to see what happens
    expect(true).toBe(true);
  });
  
  test('check existing auth state', async ({ page }) => {
    console.log('\n=== Checking existing auth state ===');
    
    await page.goto('/no/dashboard');
    await page.waitForTimeout(2000);
    
    const url = page.url();
    console.log('Dashboard access result:');
    console.log('  URL:', url);
    
    if (url.includes('/innlogging')) {
      console.log('  Status: ❌ Redirected to login (not authenticated)');
    } else if (url.includes('/dashboard')) {
      console.log('  Status: ✅ Already authenticated!');
    } else {
      console.log('  Status: ⚠️  Unexpected redirect');
    }
    
    // Check localStorage for auth tokens
    const authData = await page.evaluate(() => {
      return {
        token: localStorage.getItem('sb-auth-token'),
        hasSession: !!localStorage.getItem('sb-auth-token'),
      };
    });
    
    console.log('  Has auth token:', authData.hasSession ? '✅ YES' : '❌ NO');
    
    expect(true).toBe(true);
  });
});
