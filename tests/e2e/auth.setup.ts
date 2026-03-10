/**
 * Global Setup: Authentication for Playwright Tests
 * 
 * This setup file:
 * 1. Logs in test user via Supabase auth
 * 2. Saves session state to .auth/user.json
 * 3. Used by critical/regression tests
 */

import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const authFile = path.join(__dirname, '../../.auth/user.json');

setup('authenticate test user', async ({ page, baseURL }) => {
  // Skip if no test credentials configured
  if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
    console.warn('⚠️  TEST_USER_EMAIL or TEST_USER_PASSWORD not set - skipping auth setup');
    return;
  }

  const base = baseURL || process.env.BASE_URL || 'https://www.klarpakke.no';
  
  // Navigate to login
  await page.goto(`${base}/no/innlogging`);
  
  // Fill credentials
  await page.getByLabel(/e-post|email/i).fill(process.env.TEST_USER_EMAIL);
  await page.getByLabel(/passord|password/i).fill(process.env.TEST_USER_PASSWORD);
  
  // Submit form
  await page.getByRole('button', { name: /logg inn|sign in/i }).click();
  
  // Wait for redirect to dashboard or onboarding
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
  
  // Verify logged in
  await expect(page.getByText(/velkommen|dashboard|oversikt/i).first()).toBeVisible();
  
  // Save auth state
  await page.context().storageState({ path: authFile });
  
  console.log(`✅ Auth saved for ${process.env.TEST_USER_EMAIL}`);
});
