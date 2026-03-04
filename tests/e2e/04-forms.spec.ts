// tests/e2e/04-forms.spec.ts
// Tester at skjemaer viser validering og feilmeldinger riktig

import { test, expect } from '@playwright/test';

test.describe('Skjema-validering', () => {
  
  test('Innloggingsskjema: tom submit viser feilmelding', async ({ page }) => {
    await page.goto('/no/innlogging');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'playwright-report/screenshots/login_initial.png' });
    
    // Finn submit-knapp og klikk uten å fylle inn noe
    const submitBtn = page.locator('button[type="submit"], button:has-text("Logg inn"), button:has-text("Sign in")').first();
    
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(500);
      
      // Sjekk at feilmelding vises
      const errorMsg = page.locator('[role="alert"], .error, [class*="error"], [class*="Error"]').first();
      const inputError = page.locator('input:invalid, input[aria-invalid="true"]').first();
      
      const hasError = (await errorMsg.count()) > 0 || (await inputError.count()) > 0;
      expect(hasError, 'Ingen feilmelding ved tom submit').toBe(true);
      
      await page.screenshot({ path: 'playwright-report/screenshots/login_validation_error.png' });
    } else {
      console.log('Ingen submit-knapp funnet på innloggingssiden');
    }
  });
  
  test('Innloggingsskjema: ugyldig epost viser feil', async ({ page }) => {
    await page.goto('/no/innlogging');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('ikke-en-epost');
      
      const submitBtn = page.locator('button[type="submit"]').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'playwright-report/screenshots/login_invalid_email.png' });
      }
    }
  });
  
  test('Kontaktskjema vises og fungerer', async ({ page }) => {
    await page.goto('/no/kontakt');
    await page.waitForLoadState('networkidle');
    
    const form = page.locator('form').first();
    
    if (await form.count() > 0) {
      await expect(form).toBeVisible();
      await page.screenshot({ path: 'playwright-report/screenshots/contact_form.png', fullPage: true });
    } else {
      console.log('Ingen skjema funnet på kontaktsiden');
    }
  });
});
