import { test, expect } from '@playwright/test';

test.describe('🔐 Login E2E', () => {
  
  test('login with valid credentials', async ({ page }) => {
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    
    console.log('Testing against:', baseUrl);
    
    // Gå til innloggingssiden
    await page.goto(`${baseUrl}/no/innlogging`);
    
    // Vent på at siden er lastet
    await page.waitForLoadState('networkidle');
    
    // Klikk på "Logg inn med e-post" for å vise email-form
    const emailLoginButton = page.locator('button:has-text("Logg inn med e-post"), button:has-text("Sign in with email")');
    await emailLoginButton.waitFor({ state: 'visible', timeout: 10000 });
    await emailLoginButton.click();
    
    // Nå skal email-form være synlig
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    
    console.log('✅ Form is visible, filling credentials...');
    
    // Fyll inn credentials
    await emailInput.fill('tom@klarpakke.no');
    await page.locator('input[type="password"]').fill(process.env.TEST_USER_PASSWORD || 'bilglass123');
    
    // Klikk login
    await page.locator('button[type="submit"]').click();
    
    // Vent på redirect (kan gå til dashboard ELLER onboarding avhengig av brukerens state)
    console.log('Waiting for redirect...');
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 10000 });
    
    // Verifiser at vi er logget inn (skal ikke være på innlogging lenger)
    const url = page.url();
    console.log('Final URL:', url);
    expect(url).not.toContain('/innlogging');
    
    // Sjekk at vi er på en beskyttet side (dashboard eller onboarding)
    const isOnProtectedRoute = url.includes('/dashboard') || url.includes('/onboarding');
    expect(isOnProtectedRoute).toBe(true);
    
    console.log('✅ Login successful!');
  });
  
  test('login shows error with invalid credentials', async ({ page }) => {
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    
    await page.goto(`${baseUrl}/no/innlogging`);
    
    // Vent på at siden er lastet og klikk "Logg inn med e-post"
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("Logg inn med e-post"), button:has-text("Sign in with email")').click();
    
    // Vent på form
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    
    // Fyll inn ugyldige credentials
    await emailInput.fill('invalid@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    
    // Klikk login
    await page.locator('button[type="submit"]').click();
    
    // Vent på feilmelding
    const errorMessage = page.locator('text=/ugyldig|feil|invalid|error/i').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    
    // Verifiser at vi fortsatt er på innloggingssiden
    expect(page.url()).toContain('/innlogging');
    
    console.log('✅ Error message shown correctly');
  });
  
});
