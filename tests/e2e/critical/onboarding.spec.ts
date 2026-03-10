/**
 * @critical @onboarding
 * Test: Ny bruker → onboarding steg 1-5 → dashboard
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test.describe('Onboarding Flow @critical', () => {
  const testEmail = `klarpakke.test+${randomUUID().slice(0, 8)}@gmail.com`;
  const testPassword = `TestPass${randomUUID().slice(0, 8)}!`;

  test('new user completes onboarding 1-5 and reaches dashboard', async ({ page, baseURL }) => {
    const base = baseURL || process.env.BASE_URL || 'https://www.klarpakke.no';
    
    // Step 1: Navigate to landing and register
    await test.step('Navigate to landing page', async () => {
      await page.goto(`${base}/no`);
      await expect(page.getByRole('heading', { name: /klarpakke|krypto|trading/i }).first()).toBeVisible();
    });

    // Step 2: Click register/start
    await test.step('Click registration CTA', async () => {
      const cta = page.getByRole('link', { name: /start|registrer|kom i gang/i }).first();
      await cta.click();
      await page.waitForURL(/\/(opptak|innlogging|auth)/, { timeout: 10000 });
    });

    // Step 3: Fill registration form
    await test.step('Fill registration form', async () => {
      // Look for email input
      const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"]').first();
      await emailInput.fill(testEmail);
      
      // Look for password input
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill(testPassword);
      
      // Submit
      await page.getByRole('button', { name: /opprett|registrer|fortsett/i }).click();
    });

    // Step 4: Handle email verification or proceed to onboarding
    await test.step('Handle post-registration flow', async () => {
      // Wait for either onboarding or verification page
      await page.waitForURL(/\/(onboarding|verify|takk|dashboard)/, { timeout: 15000 });
      
      // If verification required, skip for this test (assume email is pre-verified in test env)
      if (page.url().includes('verify') || page.url().includes('takk')) {
        // Navigate directly to onboarding
        await page.goto(`${base}/no/onboarding/step/1`);
      }
    });

    // Step 5: Onboarding Step 1 - "Boten jobber for deg"
    await test.step('Onboarding Step 1: Introduction', async () => {
      await expect(page).toHaveURL(/\/onboarding\/step\/1/);
      await expect(page.getByText(/boten|jobber|kom i gang/i).first()).toBeVisible();
      
      await page.getByRole('button', { name: /kom i gang|start|fortsett/i }).click();
      await page.waitForURL(/\/onboarding\/step\/2/, { timeout: 10000 });
    });

    // Step 6: Onboarding Step 2 - Select experience level
    await test.step('Onboarding Step 2: Experience level', async () => {
      await expect(page).toHaveURL(/\/onboarding\/step\/2/);
      await expect(page.getByText(/erfaring|nivå|nybegynner/i).first()).toBeVisible();
      
      // Select "Nybegynner"
      await page.getByLabel(/nybegynner|beginner|ingen erfaring/i).check();
      await page.getByRole('button', { name: /fortsett|neste|videre/i }).click();
      await page.waitForURL(/\/onboarding\/step\/3/, { timeout: 10000 });
    });

    // Step 7: Onboarding Step 3 - Start paper trading
    await test.step('Onboarding Step 3: Paper trading setup', async () => {
      await expect(page).toHaveURL(/\/onboarding\/step\/3/);
      await expect(page.getByText(/paper|trading|virtuell|kapital/i).first()).toBeVisible();
      
      await page.getByRole('button', { name: /start|paper|fortsett/i }).click();
      await page.waitForURL(/\/onboarding\/step\/4/, { timeout: 10000 });
    });

    // Step 8: Onboarding Step 4 - Binance connection (skip)
    await test.step('Onboarding Step 4: Skip Binance', async () => {
      await expect(page).toHaveURL(/\/onboarding\/step\/4/);
      await expect(page.getByText(/binance|api|tilkobling/i).first()).toBeVisible();
      
      // Click skip/do later
      await page.getByRole('button', { name: /senere|skip|hopp over|gjør dette senere/i }).click();
      await page.waitForURL(/\/onboarding\/step\/5/, { timeout: 10000 });
    });

    // Step 9: Onboarding Step 5 - Complete
    await test.step('Onboarding Step 5: Completion', async () => {
      await expect(page).toHaveURL(/\/onboarding\/step\/5/);
      await expect(page.getByText(/klar|ferdig|gratulerer|dashboard/i).first()).toBeVisible();
      
      await page.getByRole('button', { name: /gå til dashboard|dashboard|fortsett/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    });

    // Step 10: Verify dashboard loaded
    await test.step('Verify dashboard', async () => {
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Verify no raw i18n keys visible
      const pageContent = await page.content();
      const rawI18nPattern = /dashboard\.[a-z]+\.[a-z]+/g;
      const matches = pageContent.match(rawI18nPattern);
      
      if (matches && matches.length > 0) {
        console.error('Raw i18n keys found:', matches);
      }
      expect(matches).toBeNull();
      
      // Verify bot status card or empty state is visible
      const botCard = page.getByText(/ingen aktiv bot|bot status|start paper trading/i).first();
      await expect(botCard).toBeVisible();
    });

    console.log(`✅ Onboarding test completed for ${testEmail}`);
  });
});
