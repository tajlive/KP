import { test, expect } from '@playwright/test';

test.describe('Klarpakke Google OAuth', () => {
  test('Full Google login flow @gmail', async ({ page }) => {
    // 1. START klarpakke.no
    await page.goto('https://www.klarpakke.no/no/');
    await expect(page).toHaveTitle(/Klarpakke/);
    console.log('✅ Landing page OK');

    // 2. KLIKK "Logg inn" (øverst til høyre)
    const loginNavBtn = page.getByRole('link', { name: /Logg inn/i });
    await expect(loginNavBtn).toBeVisible();
    await loginNavBtn.click();
    console.log('✅ Navigated to login page');

    // 3. KLIKK "Logg inn med Google" på innloggingssiden
    await page.waitForURL(/innlogging/);
    const googleBtn = page.getByRole('button', { name: /Google/i });
    await expect(googleBtn).toBeVisible();
    await googleBtn.click();
    console.log('✅ Google login clicked');

    // 4. Google email input
    await page.waitForURL(/accounts\.google\.com/, { timeout: 10000 });
    await page.fill('input[name="identifier"]', 'autoglassnorge@gmail.com');
    await page.getByRole('button', { name: /Neste/i }).click();
    console.log('✅ Google email OK');

    // 5. Google password input  
    await page.waitForSelector('input[name="Passwd"]', { timeout: 10000 });
    await page.fill('input[name="Passwd"]', 'bilglass123');
    await page.getByRole('button', { name: /Neste/i }).click();
    console.log('✅ Google password OK');

    // 6. Google consent
    await page.waitForURL(/oauth\/consent/, { timeout: 15000 });
    await page.getByRole('button', { name: /Tillat/i }).click();
    console.log('✅ Google consent OK');

    // 7. BACK TO klarpakke callback
    await expect(page).toHaveURL(/klarpakke\.no\/no\/auth\/callback/, { timeout: 15000 });
    console.log('✅ Callback URL OK');

    // 8. Final redirect til landing + LOGOUT knapp
    await page.waitForURL(/klarpakke\.no\/no(\/|$)/, { timeout: 10000 });
    const logoutBtn = page.getByRole('button', { name: /Logg ut/i });
    await expect(logoutBtn).toBeVisible({ timeout: 5000 });
    console.log('✅ LOGIN SUCCEEDED - Logg ut knapp synlig!');
  });
});
