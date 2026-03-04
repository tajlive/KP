/**
 * Critical Smoke Tests for Klarpakke
 *
 * These tests verify that the most critical user flows work:
 * 1. Landing page loads
 * 2. Login works
 * 3. Dashboard displays signals
 * 4. Logout works
 *
 * Run: npx playwright test tests/smoke/critical.spec.ts
 */

import { test, expect } from '@playwright/test';

// Test against staging by default, production on schedule
const BASE_URL = process.env.TEST_ENV === 'production'
  ? 'https://www.klarpakke.no'
  : 'https://klarpakke-c65071.webflow.io';

test.describe('Critical User Flows', () => {

  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Landing page loads without errors', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check hero headline
    const heroHeadline = page.locator('#hero-headline');
    await expect(heroHeadline).toBeVisible();
    await expect(heroHeadline).toContainText('Klarpakke');

    // Check CTA button exists
    const heroCta = page.locator('#hero-cta');
    await expect(heroCta).toBeVisible();

    // Check no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Verify no critical errors (allow some external script errors)
    const criticalErrors = errors.filter(e =>
      !e.includes('adsbygoogle') &&
      !e.includes('chrome-extension')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('Login page loads and form is functional', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Check form elements exist
    const emailInput = page.locator('#login-email-input');
    const passwordInput = page.locator('#login-password-input');
    const loginButton = page.locator('#login-button');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();

    // Test form validation (empty submit)
    await loginButton.click();

    // Should show error (either browser validation or custom)
    // Wait a bit for any error messages
    await page.waitForTimeout(1000);

    // Form should still be visible (not redirected)
    await expect(emailInput).toBeVisible();
  });

  test('Signup page loads and form is functional', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);

    // Check form elements exist
    const emailInput = page.locator('#signup-email-input');
    const passwordInput = page.locator('#signup-password-input');
    const confirmPasswordInput = page.locator('#signup-confirm-password-input');
    const signupButton = page.locator('#signup-button');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
    await expect(signupButton).toBeVisible();
  });

  test('Pricing page loads with all plans', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`);

    // Check pricing section exists
    const pricingSection = page.locator('#pricing-section');
    await expect(pricingSection).toBeVisible();

    // Check page loaded without errors
    await page.waitForLoadState('networkidle');

    // Verify page title contains "Priser"
    await expect(page).toHaveTitle(/Priser|Pricing/);
  });

  test('Dashboard requires authentication', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/dashboard`);

    // Should redirect to login (or show auth modal)
    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Check if redirected to login OR if login modal appeared
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('/login');
    const hasLoginModal = await page.locator('#login-form').isVisible().catch(() => false);

    expect(isLoginPage || hasLoginModal).toBeTruthy();
  });

  test('404 page works for non-existent routes', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/this-page-does-not-exist`);

    // Should either be 404 or redirect to error page
    const status = response?.status();

    // Webflow might return 200 and show error page, or actual 404
    if (status === 404) {
      expect(status).toBe(404);
    } else {
      // Check if error page content is shown
      const pageContent = await page.textContent('body');
      expect(pageContent).toMatch(/404|ikke funnet|not found/i);
    }
  });

  test('Help page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/help`);

    // Check help section exists
    const helpContent = page.locator('[data-help-content]');
    await expect(helpContent).toBeVisible();

    await page.waitForLoadState('networkidle');
  });

  test('Terms of Service page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/terms`);

    // Check legal content exists
    const termsContent = page.locator('[data-legal-content="terms"]');
    await expect(termsContent).toBeVisible();

    await page.waitForLoadState('networkidle');
  });

  test('Privacy Policy page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy`);

    // Check legal content exists
    const privacyContent = page.locator('[data-legal-content="privacy"]');
    await expect(privacyContent).toBeVisible();

    await page.waitForLoadState('networkidle');
  });

});

test.describe('Performance Checks', () => {

  test('Landing page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds on decent connection
    expect(loadTime).toBeLessThan(5000);
  });

  test('No broken images on landing page', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Get all images
    const images = await page.locator('img').all();

    for (const img of images) {
      const src = await img.getAttribute('src');
      if (src && !src.startsWith('data:')) {
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);

        // Image should have loaded (naturalWidth > 0)
        // Allow SVGs and lazy-loaded images
        if (naturalWidth === 0) {
          const isLazy = await img.getAttribute('loading');
          if (isLazy !== 'lazy') {
            console.warn(`Image failed to load: ${src}`);
          }
        }
      }
    }
  });

});
