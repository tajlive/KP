
import { test, expect } from '@playwright/test';

test.describe('Stripe Betalingstest', () => {

    test('skal vise testprodukt og pris på /test-betaling', async ({ page }) => {
        // 1. Gå til testsiden
        await page.goto('/no/test-betaling');

        // 2. Sjekk at viktig innhold vises
        await expect(page.locator('h1')).toContainText('Betalingstest');
        await expect(page.locator('text=20 kr')).toBeVisible();

        // 3. Sjekk at "Betal med kort"-knappen finnes
        const betalKnapp = page.locator('button', { hasText: 'Betal med kort' });
        await expect(betalKnapp).toBeVisible();
    });

    test('skal kunne klikke på betal-knapp og bli videresendt til Stripe', async ({ page }) => {
        await page.goto('/no/test-betaling');

        // Lytt etter nettverkskall
        const requestPromise = page.waitForRequest(request =>
            request.url().includes('/api/checkout/test') && request.method() === 'POST'
        );

        // Klikk
        await page.click('button:has-text("Betal med kort")');

        // Vent på API-kall
        const request = await requestPromise;
        expect(request).toBeTruthy();

        // Merk: Vi kan ikke fullføre selve betalingen i en automatisert test mot Live Stripe
        // uten å bruke ekte kort, så vi sjekker bare at vi blir videresendt til stripe.com
        await page.waitForURL(/checkout.stripe.com/, { timeout: 10000 });
    });

});
