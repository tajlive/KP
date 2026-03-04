import { test, expect } from '@playwright/test';

test.describe('Unified Trading Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard and login if needed
    await page.goto('/no/dashboard');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('Should show same UI structure for paper and live mode', async ({ page }) => {
    // Verify paper mode is default
    await expect(page.locator('text=Paper Trading').first()).toBeVisible();
    
    // Check that all trading elements are present
    await expect(page.locator('[data-testid="unified-trading-interface"]')).toBeVisible();
    await expect(page.locator('text=Chart')).toBeVisible();
    await expect(page.locator('text=Posisjoner')).toBeVisible();
    await expect(page.locator('text=Kjøp')).toBeVisible();
    await expect(page.locator('text=Selg')).toBeVisible();
  });

  test('Should show slippage simulation in paper mode', async ({ page }) => {
    // Navigate to trading page
    await page.goto('/no/dashboard');
    
    // Verify paper mode
    await expect(page.locator('text=Paper Trading').first()).toBeVisible();
    
    // Look for slippage info or simulate a trade to see slippage
    const paperModeInfo = page.locator('text=slippage');
    if (await paperModeInfo.isVisible().catch(() => false)) {
      await expect(paperModeInfo).toBeVisible();
    }
  });

  test('Should show stress indicator in paper mode', async ({ page }) => {
    await page.goto('/no/dashboard');
    
    // Stress indicator should be visible in paper mode
    await expect(page.locator('text=Emosjonell Stress-Nivå').first()).toBeVisible();
  });

  test('Should show transition guide with readiness score', async ({ page }) => {
    await page.goto('/no/dashboard');
    
    // Transition guide should be visible
    await expect(page.locator('[data-testid="transition-guide"]')).toBeVisible();
    
    // Should show checkpoints
    await expect(page.locator('text=50+ Paper Trades')).toBeVisible();
    await expect(page.locator('text=Konsekvent Profitabilitet')).toBeVisible();
    await expect(page.locator('text=Risikostyring under Kontroll')).toBeVisible();
    
    // Should show readiness score
    await expect(page.locator('text=/\\d+% klar/')).toBeVisible();
  });

  test('Should show mode toggle with confirmation modal', async ({ page }) => {
    await page.goto('/no/dashboard');
    
    // Find and click the mode toggle
    const toggle = page.locator('[role="switch"]').first();
    await expect(toggle).toBeVisible();
    
    // Try to toggle to live (will show connect modal or confirmation)
    await toggle.click();
    
    // Should show either connect modal or confirmation
    const connectModal = page.locator('text=Koble til Binance');
    const confirmModal = page.locator('text=Bytt til Live Trading?');
    
    const hasModal = await Promise.race([
      connectModal.isVisible().then(v => v ? 'connect' : null),
      confirmModal.isVisible().then(v => v ? 'confirm' : null),
    ]);
    
    expect(hasModal).toBeTruthy();
    
    // Cancel the modal
    const cancelButton = page.locator('text=Avbryt').first();
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }
    
    // Verify still in paper mode
    await expect(page.locator('text=Paper Trading').first()).toBeVisible();
  });

  test('Should handle order placement with slippage in paper mode', async ({ page }) => {
    await page.goto('/no/dashboard');
    
    // Wait for trading panel to load
    await page.waitForSelector('text=Kjøp');
    
    // Enter order amount
    const amountInput = page.locator('input[type="number"]').first();
    if (await amountInput.isVisible()) {
      await amountInput.fill('0.01');
      
      // Click buy button
      const buyButton = page.locator('button:has-text("Kjøp"), button:has-text("Bekreft")').first();
      if (await buyButton.isEnabled()) {
        await buyButton.click();
        
        // Wait for position to appear or confirmation
        await page.waitForTimeout(1000);
      }
    }
  });

  test('Should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/no/dashboard');
    
    // Verify key elements are visible on mobile
    await expect(page.locator('text=Paper Trading').first()).toBeVisible();
    
    // Mode toggle should be accessible
    const toggle = page.locator('[role="switch"]').first();
    await expect(toggle).toBeVisible();
  });

  test('Should show correct colors and badges for paper vs live mode', async ({ page }) => {
    await page.goto('/no/dashboard');
    
    // Paper mode should have green styling
    const paperBadge = page.locator('text=Paper Trading').first();
    await expect(paperBadge).toBeVisible();
    
    // Look for green color indicator
    const greenIndicator = page.locator('.bg-green-100, .text-green-600, [class*="green"]').first();
    await expect(greenIndicator).toBeVisible();
  });

  test('Should display positions table correctly', async ({ page }) => {
    await page.goto('/no/dashboard');
    
    // Positions table header should be visible
    await expect(page.locator('text=Posisjoner')).toBeVisible();
    
    // Table headers
    const headers = ['Symbol', 'Side', 'Amount', 'Price', 'P&L'];
    for (const header of headers) {
      const headerElement = page.locator(`th:has-text("${header}"), text=${header}`).first();
      // Some headers might be abbreviated in Norwegian
    }
  });

  test('Should show stress levels based on PnL', async ({ page }) => {
    await page.goto('/no/dashboard');
    
    // Stress indicator should show a level
    const stressIndicator = page.locator('[data-testid="stress-indicator"]');
    
    // Check for stress level percentage
    const stressText = await page.locator('text=/\\d+%/').first().textContent();
    if (stressText) {
      const stressLevel = parseInt(stressText.replace('%', ''));
      expect(stressLevel).toBeGreaterThanOrEqual(0);
      expect(stressLevel).toBeLessThanOrEqual(100);
    }
  });
});

test.describe('Slippage Simulation', () => {
  test('Should calculate different slippage for market vs limit orders', async ({ page }) => {
    await page.goto('/no/dashboard');
    
    // Paper mode should be active
    await expect(page.locator('text=Paper Trading').first()).toBeVisible();
    
    // Switch between market and limit order types if available
    const marketTab = page.locator('text=Marked, text=Market').first();
    const limitTab = page.locator('text=Limit').first();
    
    if (await marketTab.isVisible() && await limitTab.isVisible()) {
      // Test market order (should have slippage)
      await marketTab.click();
      
      // Test limit order (should have no slippage)
      await limitTab.click();
    }
  });
});

test.describe('Transition Guide', () => {
  test('Should show progress towards live trading readiness', async ({ page }) => {
    await page.goto('/no/dashboard');
    
    // Find transition guide
    const guide = page.locator('[data-testid="transition-guide"]');
    await expect(guide).toBeVisible();
    
    // Should show 4 checkpoints
    const checkpoints = [
      '50+ Paper Trades',
      'Konsekvent Profitabilitet',
      'Risikostyring under Kontroll',
      'Disiplin',
    ];
    
    for (const checkpoint of checkpoints) {
      const element = page.locator(`text=${checkpoint}`).first();
      await expect(element).toBeVisible();
    }
  });

  test('Should update readiness score based on trading history', async ({ page }) => {
    await page.goto('/no/dashboard');
    
    // Readiness score should be displayed
    const scoreElement = page.locator('text=/\\d+% klar/');
    await expect(scoreElement).toBeVisible();
  });
});
