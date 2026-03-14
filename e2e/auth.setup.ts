import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Auth setup - Cache authentication state
 * This runs before critical and regression tests
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const authFile = join(__dirname, '../.auth/user.json');

setup('authenticate via API or mock', async ({ page, context }) => {
  // Ensure .auth directory exists
  const authDir = dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Check if we have real credentials
  const hasCredentials = process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD;
  
  if (!hasCredentials) {
    console.log('⚠️ No E2E credentials, using mock auth for testing');
    
    // Set minimal cookies for local testing
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-token-for-e2e-testing-only',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }
    ]);
    
    await context.storageState({ path: authFile });
    console.log('✅ Mock auth state saved');
    return;
  }

  // Real authentication flow (email/password or OAuth)
  console.log('🔐 Attempting real authentication...');
  
  await page.goto('/no/innlogging');
  await page.waitForLoadState('networkidle');
  
  // Check if already logged in (redirected to dashboard)
  if (page.url().includes('/dashboard') || page.url().includes('/onboarding')) {
    console.log('✅ Already authenticated');
    await context.storageState({ path: authFile });
    return;
  }
  
  // 1) Try email/password form first (same as TEST_USER_EMAIL for compatibility)
  const emailInput = page.getByLabel(/e-post|email/i).first();
  const passwordInput = page.getByLabel(/passord|password/i).first();
  const submitBtn = page.getByRole('button', { name: /logg inn|sign in/i });
  
  if (await emailInput.isVisible().catch(() => false)) {
    console.log('Logging in with email/password...');
    await emailInput.fill(process.env.E2E_USER_EMAIL!);
    await passwordInput.fill(process.env.E2E_USER_PASSWORD!);
    await submitBtn.click();
    try {
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20000 });
      console.log('✅ Email/password login successful');
      await context.storageState({ path: authFile });
      return;
    } catch {
      console.log('⚠️ Email/password login did not redirect, continuing...');
    }
  }
  
  // 2) Fallback: try Google OAuth
  const googleButton = page.locator('[data-provider="google"], button:has-text("Google")').first();
  if (await googleButton.isVisible().catch(() => false)) {
    console.log('Trying Google OAuth...');
    const [popup] = await Promise.all([
      context.waitForEvent('page').catch(() => null),
      googleButton.click()
    ]);
    if (popup) {
      await popup.waitForLoadState();
      try {
        await popup.fill('input[type="email"]', process.env.E2E_USER_EMAIL!);
        await popup.click('button:has-text("Next")');
        await popup.fill('input[type="password"]', process.env.E2E_USER_PASSWORD!);
        await popup.click('button:has-text("Next")');
        await page.waitForURL(/.*dashboard.*/, { timeout: 30000 });
        console.log('✅ OAuth authentication successful');
      } catch (e) {
        console.log('⚠️ OAuth flow failed');
      }
    }
  }
  
  await context.storageState({ path: authFile });
  console.log('✅ Auth state saved to', authFile);
});
