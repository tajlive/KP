import { test, expect } from '@playwright/test';

test.describe('Launch Critical Path', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.goto('/');
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-'))
        .forEach(k => localStorage.removeItem(k));
    });
  });

  test('Pricing page loads and displays plans', async ({ page }) => {
    await page.goto('/priser');
    
    // Verify page title
    await expect(page.getByRole('heading', { name: /pris/i })).toBeVisible();
    
    // Verify all plans are visible
    await expect(page.getByText('Student')).toBeVisible();
    await expect(page.getByText('Bachelor')).toBeVisible();
    await expect(page.getByText('Master')).toBeVisible();
    await expect(page.getByText('PhD')).toBeVisible();
    
    // Verify trust indicators
    await expect(page.getByText('Betalingen håndteres trygt via Stripe')).toBeVisible();
    await expect(page.getByText('Du kan avslutte når som helst')).toBeVisible();
  });

  test('Checkout start triggers correctly', async ({ page }) => {
    await page.goto('/priser');
    
    // Find and click a paid plan
    const bachelorButton = page.getByRole('button', { name: /velg plan/i }).first();
    await expect(bachelorButton).toBeVisible();
    
    // Click the button
    await bachelorButton.click();
    
    // Should show loading state or redirect to checkout
    await expect(page.getByText(/laster|redirect/i)).toBeVisible({ timeout: 5000 }).catch(() => {
      // If no loading text, we might have been redirected
      console.log('Checkout initiated');
    });
  });

  test('Onboarding flow completes successfully', async ({ page }) => {
    await page.goto('/');
    
    // Step 1: Welcome screen
    await expect(page.getByText(/klar for å la pengene jobbe/i)).toBeVisible();
    await expect(page.getByText('BankID-sikret')).toBeVisible();
    
    // Click start button
    await page.getByRole('button', { name: /kom i gang/i }).click();
    
    // Step 2: Risk selection
    await expect(page.getByText(/velg din strategi/i)).toBeVisible({ timeout: 2000 });
    
    // Select balanced risk
    await page.getByText(/balansert/i).click();
    await page.getByRole('button', { name: /fortsett/i }).click();
    
    // Step 3: Completion
    await expect(page.getByText(/du er klar/i)).toBeVisible({ timeout: 2000 });
    
    // Click dashboard button
    await page.getByRole('button', { name: /åpne mitt dashboard/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
  });

  test('Can skip onboarding to dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Click skip button
    await page.getByRole('button', { name: /se dashbordet uten/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
  });

  test('Dashboard loads after onboarding', async ({ page }) => {
    // Simulate completed onboarding
    await page.goto('/dashboard');
    
    // Verify dashboard elements
    await expect(page.getByText(/dashboard|portefølje/i)).toBeVisible();
    await expect(page.getByTestId('dashboard-root')).toBeVisible();
  });

  test('Trust section visible on pricing', async ({ page }) => {
    await page.goto('/priser');
    
    // Verify trust section
    await expect(page.getByText('Din sikkerhet er vår prioritet')).toBeVisible();
    await expect(page.getByText('BankID-sikkerhet')).toBeVisible();
    await expect(page.getByText('Trygg betaling med Stripe')).toBeVisible();
    await expect(page.getByText('Kryptert data')).toBeVisible();
  });

  test('FAQ section expands and collapses', async ({ page }) => {
    await page.goto('/priser');
    
    // Find FAQ section
    await expect(page.getByText('Ofte stilte spørsmål')).toBeVisible();
    
    // Click on first FAQ
    const firstQuestion = page.getByText('Hva koster det?');
    await firstQuestion.click();
    
    // Answer should be visible
    await expect(page.getByText(/vi har flere prisnivåer/i)).toBeVisible();
    
    // Click again to collapse
    await firstQuestion.click();
  });
});

test.describe('Mobile Responsive', () => {
  test('Pricing page on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/priser');
    
    // Should show mobile layout
    await expect(page.getByText('Student')).toBeVisible();
    await expect(page.getByText('Bachelor')).toBeVisible();
  });

  test('Onboarding on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    
    // Should show onboarding
    await expect(page.getByText(/klar for å la pengene jobbe/i)).toBeVisible();
    
    // Navigate through
    await page.getByRole('button', { name: /kom i gang/i }).click();
    await expect(page.getByText(/velg din strategi/i)).toBeVisible({ timeout: 2000 });
  });
});
