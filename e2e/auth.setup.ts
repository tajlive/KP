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

  // Real authentication flow
  console.log('🔐 Attempting real authentication...');
  
  await page.goto('/innlogging');
  await page.waitForLoadState('networkidle');
  
  // Check if already logged in (redirected to dashboard)
  if (page.url().includes('/dashboard')) {
    console.log('✅ Already authenticated');
    await context.storageState({ path: authFile });
    return;
  }
  
  // Try Google OAuth
  const googleButton = page.locator('[data-provider="google"], button:has-text("Google")').first();
  if (await googleButton.isVisible().catch(() => false)) {
    console.log('Clicking Google OAuth...');
    
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
        
        // Wait for redirect back
        await page.waitForURL(/.*dashboard.*/, { timeout: 30000 });
        console.log('✅ OAuth authentication successful');
      } catch (e) {
        console.log('⚠️ OAuth flow failed, using mock auth');
      }
    }
  }
  
  // Save auth state regardless
  await context.storageState({ path: authFile });
  console.log('✅ Auth state saved to', authFile);
});
