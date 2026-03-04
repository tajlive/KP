/**
 * Beta Signup E2E Test
 * Test the complete beta application signup flow
 */

import { test, expect } from '@playwright/test';

test.describe('Beta Application Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to beta application page
    await page.goto('/no/beta/apply');
    // Wait for page to load
    await expect(page).toHaveTitle(/apply|beta/i);
  });

  test('should load beta application form', async ({ page }) => {
    // Check form elements exist
    expect(
      await page.locator('text=Apply for Beta Access')
    ).toBeVisible();

    expect(
      await page.locator('select')
    ).toHaveCount(2); // experience and risk tolerance
  });

  test('should show validation errors on empty submit', async ({
    page,
  }) => {
    // Try to submit empty form
    await page.click('button:has-text("Submit")');

    // Wait for error messages
    await expect(
      page.locator('text=Please select your experience level')
    ).toBeVisible();
  });

  test('should successfully submit valid beta application', async ({
    page,
  }) => {
    // Fill in form
    await page.locator('select[name="experience"]').selectOption('beginner');

    await page.locator('textarea[name="motivation"]').fill(
      'I want to learn cryptocurrency trading and improve my skills with a ' +
      'paper trading simulator before investing real money.'
    );

    await page
      .locator('select[name="riskTolerance"]')
      .selectOption('moderate');

    // Check the acknowledgment checkbox
    await page.locator('input[type="checkbox"]').check();

    // Submit form
    await page.click('button:has-text("Submit")');

    // Wait for success page
    await expect(page).toHaveURL(/thank|success|takk/i);
    await expect(
      page.locator('text=Thank you|Takk|successful')
    ).toBeVisible();
  });

  test('should show error when motivation is too short', async ({
    page,
  }) => {
    // Fill form with short motivation
    await page.locator('select[name="experience"]').selectOption('beginner');
    await page.locator('textarea[name="motivation"]').fill('Short');
    await page.locator('select[name="riskTolerance"]').selectOption('moderate');
    await page.locator('input[type="checkbox"]').check();

    // Try submit
    await page.click('button:has-text("Submit")');

    // Should show validation error
    await expect(
      page.locator('text=min 10|minimum 10')
    ).toBeVisible();
  });

  test('should require risk acknowledgement', async ({ page }) => {
    // Fill form without checking acknowledgment
    await page.locator('select[name="experience"]').selectOption('beginner');
    await page.locator('textarea[name="motivation"]').fill(
      'I want to learn cryptocurrency trading properly'
    );
    await page.locator('select[name="riskTolerance"]').selectOption('moderate');

    // Don't check the checkbox

    // Try submit
    await page.click('button:has-text("Submit")');

    // Should show error
    await expect(
      page.locator('text=acknowledge|accept|must agree')
    ).toBeVisible();
  });

  test('should handle network errors gracefully', async ({
    page,
    context,
  }) => {
    // Go offline
    await context.setOffline(true);

    // Fill and submit form
    await page.locator('select[name="experience"]').selectOption('beginner');
    await page.locator('textarea[name="motivation"]').fill(
      'I want to learn cryptocurrency trading'
    );
    await page.locator('select[name="riskTolerance"]').selectOption('moderate');
    await page.locator('input[type="checkbox"]').check();

    await page.click('button:has-text("Submit")');

    // Should show network error
    await expect(
      page.locator('text=network|connection|offline')
    ).toBeVisible({ timeout: 5000 });

    // Go back online
    await context.setOffline(false);

    // Should be able to retry
    await page.click('button:has-text("Try Again|Retry")');

    // Should eventually succeed or show server error
    await page.waitForNavigation({
      waitUntil: 'networkidle',
      timeout: 10000,
    });
  });
});

test.describe('Beta Application - Mobile Responsive', () => {
  test('should be responsive on mobile', async ({
    page,
    context,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to form
    await page.goto('/no/beta/apply');

    // Check form is visible
    expect(
      await page.locator('form')
    ).toBeVisible();

    // Check form elements stack vertically
    const selects = page.locator('select');
    const firstSelectBox = await selects.first().boundingBox();
    const secondSelectBox = await selects.nth(1).boundingBox();

    // Second select should be below first (mobile layout)
    expect(secondSelectBox?.y).toBeGreaterThan(firstSelectBox?.y || 0);
  });
});
