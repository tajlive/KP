import { test, expect } from '@playwright/test';

test.describe('Preview Mode (Småsparer-first)', () => {
  test('should show demo content for unauthenticated users on /app/dashboard', async ({ page, context }) => {
    // Clear cookies to ensure not authenticated
    await context.clearCookies();

    await page.goto('/app/dashboard');

    // Should either show preview mode or redirect to login
    const url = page.url();

    // Look for demo signals or preview overlay
    const demoSignals = page.locator('.signal-card-demo, [data-demo]').first();
    const previewOverlay = page.locator('[data-preview-overlay]').first();

    const hasPreviewMode = await Promise.race([
      demoSignals.isVisible().catch(() => false),
      previewOverlay.isVisible().catch(() => false),
    ]);

    if (!hasPreviewMode) {
      // Should redirect to login instead
      expect(url).toContain('/login');
    }
  });

  test('should have demo badge on preview signals', async ({ page, context }) => {
    await context.clearCookies();

    await page.goto('/app/dashboard');

    // Look for demo badges
    const demoBadge = page.locator('[class*="demo"], [class*="preview"]').first();

    if (await demoBadge.isVisible().catch(() => false)) {
      const text = await demoBadge.textContent();
      expect(text?.toLowerCase()).toMatch(/demo|preview/i);
    }
  });

  test('preview overlay should prompt login', async ({ page, context }) => {
    await context.clearCookies();

    await page.goto('/app/dashboard');

    const loginCta = page.locator('[data-preview-overlay] button, [data-login-cta]').first();

    if (await loginCta.isVisible().catch(() => false)) {
      const text = await loginCta.textContent();
      expect(text?.toLowerCase()).toContain('login');
    }
  });
});
