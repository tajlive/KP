import { test, expect } from '@playwright/test';

/**
 * Happy path E2E — Klarpakke
 * Tester kjerneflyt: dashboard -> paper-trade -> auto-trade
 *
 * Bruker pre-authenticated state fra auth.setup.ts.
 * baseURL resolves automatisk fra playwright.config.ts.
 * Alle paths inkluderer /no/ locale-prefix.
 *
 * NB: Produksjonsbruker (tom@klarpakke.no) kan vise onboarding-dialog.
 *     Testene klikker "Se dashbordet uten å sette opp" for å skippe denne.
 */

/** Klikk "Se dashbordet uten å sette opp" hvis onboarding-dialog vises */
async function skipOnboardingIfPresent(page: any): Promise<void> {
  const skipButton = page.getByRole('button', { name: /Se dashbordet uten å sette opp/i });
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
    await expect(skipButton).not.toBeVisible({ timeout: 5000 });
  }
}

test.describe('Klarpakke Happy Path', () => {
  test('dashboard laster', async ({ page }) => {
    await page.goto('/no/dashboard');
    await expect(page).toHaveURL(/\/no\/dashboard/, { timeout: 10000 });

    await skipOnboardingIfPresent(page);

    // Dashboard viser paper-trading modus og portefølje (ikke data-testid)
    await expect(
      page.getByText(/Øvingsmodus|Din portefølje/).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('paper-trade side laster og viser konfig-kort', async ({ page }) => {
    await page.goto('/no/dashboard/trade?mode=paper');
    await expect(page).toHaveURL(/\/no\/dashboard\/trade/, { timeout: 10000 });

    await skipOnboardingIfPresent(page);

    await expect(
      page.getByText('Lekepenger').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('auto-trade side: wizard for trading-bot vises', async ({ page }) => {
    await page.goto('/no/dashboard/auto-trade');
    await expect(page).toHaveURL(/\/no\/dashboard/, { timeout: 10000 });

    await skipOnboardingIfPresent(page);

    // Trading-bot wizard vises (velg strategi -> beløp -> start)
    await expect(
      page.getByRole('heading', { name: /Start trading-bot/i })
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText('Velg strategi').first()
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole('button', { name: /Neste/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test('scroll fungerer pa mobil (iOS-fix)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/no/dashboard');
    await expect(page).toHaveURL(/\/no\/dashboard/, { timeout: 10000 });

    await skipOnboardingIfPresent(page);

    const bodyOverflow = await page.evaluate(() => {
      return window.getComputedStyle(document.body).overflow;
    });
    expect(bodyOverflow).not.toBe('hidden');
  });
});
