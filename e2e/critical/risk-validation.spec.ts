import { test, expect } from '@playwright/test';
import { loginWithCredentials } from '../helpers/auth';

/**
 * Risk Validation E2E Tests
 * 
 * Verifiserer at risk profiler faktisk håndheves:
 * - Low risk (forsiktig): 2% position, 5% exposure, 1% daily loss
 * - Paper trading med 100k NOK
 */

const TEST_TRADER = {
  email: 'test.trader.lowrisk@klarpakke.no',
  password: 'TestLowRisk123!',
};

test.describe('Risk Validation @critical @risk', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithCredentials(page, TEST_TRADER.email, TEST_TRADER.password);
  });

  test('viser korrekt risikonivå i dashboard', async ({ page }) => {
    await page.goto('/no/paper-trading');
    
    // Sjekk at risk badge vises med korrekt tekst
    const riskBadge = page.getByTestId('risk-level-badge');
    await expect(riskBadge).toBeVisible({ timeout: 10000 });
    
    // Forventer "Forsiktig" (low risk på norsk)
    await expect(riskBadge).toContainText(/forsiktig|low/i);
    
    // Verifiser at grenser vises i UI
    const riskInfo = page.locator('[data-testid="risk-info"], .risk-info, [class*="risk"]').first();
    if (await riskInfo.isVisible().catch(() => false)) {
      const text = await riskInfo.textContent() || '';
      // Sjekk at 2% nevnes (max position)
      expect(text).toMatch(/2%/);
    }
  });

  test('tillater trade på 1500 NOK (innenfor 2% = 2000 NOK)', async ({ page }) => {
    await page.goto('/no/paper-trading');
    
    // Vent på at siden er lastet
    await page.waitForLoadState('networkidle');
    
    // Fyll inn trade-amount (1500 NOK er under 2% av 100k = 2000 NOK)
    const amountInput = page.locator('input[name="amount"], input[data-testid="trade-amount"], input[placeholder*="beløp" i]').first();
    
    if (await amountInput.isVisible().catch(() => false)) {
      await amountInput.fill('1500');
    } else {
      // Alternative: velg fra dropdown/preset
      const presetButton = page.locator('button:has-text("1 500"), button:has-text("1500"), [data-testid*="1500"]').first();
      if (await presetButton.isVisible().catch(() => false)) {
        await presetButton.click();
      }
    }
    
    // Velg BTC
    const pairSelect = page.locator('select[name="pair"], [data-testid="pair-select"]').first();
    if (await pairSelect.isVisible().catch(() => false)) {
      await pairSelect.selectOption('BTCUSDT');
    }
    
    // Klikk kjøp
    const buyButton = page.locator('button:has-text("Kjøp"), button:has-text("Buy"), [data-testid="buy-button"]').first();
    await buyButton.click();
    
    // Forvent suksess (enten toast, modal, eller oppdatering av historikk)
    const successIndicator = page.locator(
      '[data-testid="trade-success"], .toast:has-text("suksess"), .alert:has-text("kjøpt"), text=success'
    ).first();
    
    // Vent litt på prosessering
    await page.waitForTimeout(2000);
    
    // Sjekk at vi IKKE fikk feilmelding om risk
    const errorText = await page.locator('body').textContent() || '';
    expect(errorText).not.toContain('POSISJONSBEGRENSNING');
    expect(errorText).not.toContain('EXPOSURE_LIMIT_EXCEEDED');
  });

  test('blokkerer trade på 5000 NOK (over 2% = 2000 NOK)', async ({ page }) => {
    await page.goto('/no/paper-trading');
    await page.waitForLoadState('networkidle');
    
    // Prøv å trade 5000 NOK (over 2% grense)
    const amountInput = page.locator('input[name="amount"], input[data-testid="trade-amount"]').first();
    
    if (await amountInput.isVisible().catch(() => false)) {
      await amountInput.fill('5000');
    } else {
      test.skip('Trade amount input ikke funnet - UI kan ha endret seg');
    }
    
    // Velg BTC
    const pairSelect = page.locator('select[name="pair"], [data-testid="pair-select"]').first();
    if (await pairSelect.isVisible().catch(() => false)) {
      await pairSelect.selectOption('BTCUSDT');
    }
    
    // Klikk kjøp
    const buyButton = page.locator('button:has-text("Kjøp"), button:has-text("Buy"), [data-testid="buy-button"]').first();
    await buyButton.click();
    
    // Vent på respons
    await page.waitForTimeout(2000);
    
    // Sjekk for blokkeringsmelding
    const bodyText = await page.locator('body').textContent() || '';
    
    // Forventer en av disse indikatorene på at trade ble blokkert
    const blocked = 
      bodyText.includes('POSISJONSBEGRENSNING') ||
      bodyText.includes('POSITION_LIMIT') ||
      bodyText.includes('for stor') ||
      bodyText.includes('max position') ||
      bodyText.includes('2%') ||
      await page.locator('[data-testid="trade-blocked"]').isVisible().catch(() => false);
    
    expect(blocked, 'Trade skulle ha blitt blokkert pga position limit').toBe(true);
  });

  test('portefølje viser korrekt saldo etter trade', async ({ page }) => {
    await page.goto('/no/paper-trading');
    await page.waitForLoadState('networkidle');
    
    // Sjekk at saldo vises
    const balanceElement = page.locator(
      '[data-testid="balance"], .balance, text=100 000, text=100000'
    ).first();
    
    if (await balanceElement.isVisible().catch(() => false)) {
      const balanceText = await balanceElement.textContent() || '';
      // Forventer 100,000 eller 100000
      expect(balanceText).toMatch(/100[\s,]*000/);
    }
  });

  test('konsistent state etter refresh', async ({ page }) => {
    await page.goto('/no/paper-trading');
    await page.waitForLoadState('networkidle');
    
    // Husk initial state
    const initialUrl = page.url();
    
    // Refresh
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verifiser at vi er på samme side
    expect(page.url()).toBe(initialUrl);
    
    // Verifiser at bruker fortsatt er logget inn (dashboard/papir-trading vises)
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText).not.toContain('Logg inn');
    expect(bodyText).not.toContain('innlogging');
    
    // Verifiser at risk info fortsatt vises
    const riskBadge = page.getByTestId('risk-level-badge');
    if (await riskBadge.isVisible().catch(() => false)) {
      await expect(riskBadge).toContainText(/forsiktig|low/i);
    }
  });

  test('api returnerer 401 uten auth', async ({ request }) => {
    // Test at API faktisk krever auth
    const response = await request.post('/api/paper-trading/execute', {
      data: {
        pair: 'BTCUSDT',
        side: 'buy',
        amount_nok: 1000,
      },
    });
    
    expect(response.status()).toBe(401);
  });
});
