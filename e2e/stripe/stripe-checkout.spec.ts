import { test, expect } from '@playwright/test';

test.describe('Stripe checkout flow', () => {
  test('navigates to checkout and redirects to Stripe', async ({ page }) => {
    await page.goto('/checkout');
    // Wait for the checkout button and click it
    const startTrial = page.getByRole('button', { name: /start free trial/i });
    await expect(startTrial).toBeVisible();
    
    // Note: actual Stripe redirect requires test-mode secrets and may leave the origin domain.
    // This test validates the CTA presence and href/redirect behavior.
    await Promise.all([
      page.waitForURL(/stripe\.com|checkout\.session/, { timeout: 10000 }),
      startTrial.click(),
    ]);
  });
});
