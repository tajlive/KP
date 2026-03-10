/**
 * @critical @i18n
 * Test: /en/ ruter viser ALT på engelsk, ingen norske strenger
 */

import { test, expect } from '@playwright/test';

test.describe('i18n Language Coverage @critical', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page, baseURL }) => {
    // Login before test if credentials available
    if (process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
      const base = baseURL || process.env.BASE_URL || 'https://www.klarpakke.no';
      await page.goto(`${base}/no/innlogging`);
      await page.getByLabel(/e-post|email/i).fill(process.env.TEST_USER_EMAIL);
      await page.getByLabel(/passord|password/i).fill(process.env.TEST_USER_PASSWORD);
      await page.getByRole('button', { name: /logg inn|sign in/i }).click();
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
    }
  });

  test('/en/dashboard shows all English text, no Norwegian', async ({ page, baseURL }) => {
    const base = baseURL || process.env.BASE_URL || 'https://www.klarpakke.no';

    await test.step('Navigate to English dashboard', async () => {
      await page.goto(`${base}/en/dashboard`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify no raw i18n keys visible', async () => {
      const content = await page.content();
      
      // Check for patterns like "dashboard.botStatus.xxx"
      const rawI18nPattern = /[a-z]+\.[a-z]+\.[a-z]+/g;
      const matches = content.match(rawI18nPattern);
      
      if (matches) {
        // Filter out common non-i18n patterns
        const i18nMatches = matches.filter(m => 
          !m.includes('www') && 
          !m.includes('com') && 
          !m.includes('api') &&
          !m.includes('json')
        );
        
        if (i18nMatches.length > 0) {
          console.error('Raw i18n keys found:', i18nMatches);
        }
        expect(i18nMatches).toHaveLength(0);
      }
    });

    await test.step('Verify no common Norwegian words', async () => {
      const norwegianWords = [
        'Innstillinger',
        'Logg ut',
        'Oversikt',
        'Siste handler',
        'Ingen aktiv bot',
        'Laster',
        'Start paper trading',
        'Kom i gang',
        'Se detaljer',
        'Pauset',
        'Aktiv',
        'Stoppet'
      ];

      const bodyText = await page.locator('body').innerText();
      
      for (const word of norwegianWords) {
        expect(bodyText, `Norwegian word "${word}" should not appear in /en/`)
          .not.toContain(word);
      }
    });

    await test.step('Verify English content is present', async () => {
      // Check for expected English text
      await expect(page.getByText(/Dashboard|Overview|Settings|Log out/i).first()).toBeVisible();
    });
  });

  test('/en/paper-trading shows English interface', async ({ page, baseURL }) => {
    const base = baseURL || process.env.BASE_URL || 'https://www.klarpakke.no';

    await page.goto(`${base}/en/paper-trading`);
    await page.waitForLoadState('networkidle');

    await test.step('Verify English paper trading labels', async () => {
      // Should see English text
      const bodyText = await page.locator('body').innerText();
      
      // Common English terms that should be present
      const englishTerms = ['Paper Trading', 'Balance', 'Start new session', 'Session'];
      const hasEnglish = englishTerms.some(term => 
        bodyText.toLowerCase().includes(term.toLowerCase())
      );
      
      expect(hasEnglish, 'Should contain English terms').toBe(true);
    });

    await test.step('Verify no Norwegian paper trading terms', async () => {
      const norwegianTerms = [
        'Papirhandel',
        'Start ny sesjon',
        'Nåværende verdi',
        'Aktiv',
        'Pauset',
        'Stoppet',
        'Saldo'
      ];

      const bodyText = await page.locator('body').innerText();
      
      for (const term of norwegianTerms) {
        expect(bodyText, `Norwegian term "${term}" should not appear`)
          .not.toContain(term);
      }
    });
  });

  test('/no/dashboard shows Norwegian text', async ({ page, baseURL }) => {
    const base = baseURL || process.env.BASE_URL || 'https://www.klarpakke.no';

    await page.goto(`${base}/no/dashboard`);
    await page.waitForLoadState('networkidle');

    await test.step('Verify Norwegian content', async () => {
      // Check for expected Norwegian text
      const bodyText = await page.locator('body').innerText();
      
      const hasNorwegian = 
        bodyText.includes('Innstillinger') ||
        bodyText.includes('Logg ut') ||
        bodyText.includes('Oversikt') ||
        bodyText.includes('Dashboard') || // Acceptable - shared term
        bodyText.includes('Bot status');
      
      expect(hasNorwegian, 'Should contain Norwegian text').toBe(true);
    });

    await test.step('Verify no raw i18n keys in Norwegian version', async () => {
      const content = await page.content();
      const rawI18nPattern = /dashboard\.[a-z]+\.[a-z]+/g;
      const matches = content.match(rawI18nPattern);
      
      expect(matches).toBeNull();
    });
  });

  test('language switcher works correctly', async ({ page, baseURL }) => {
    const base = baseURL || process.env.BASE_URL || 'https://www.klarpakke.no';

    await test.step('Start at Norwegian dashboard', async () => {
      await page.goto(`${base}/no/dashboard`);
      await page.waitForLoadState('networkidle');
      
      // Verify Norwegian
      const noText = await page.locator('body').innerText();
      expect(noText.includes('Innstillinger') || noText.includes('Oversikt')).toBe(true);
    });

    await test.step('Switch to English', async () => {
      // Look for language switcher
      const langSwitcher = page.locator('[data-testid="language-switcher"], a[href*="/en/"]').first();
      
      if (await langSwitcher.isVisible().catch(() => false)) {
        await langSwitcher.click();
        await page.waitForURL(/\/en\//, { timeout: 10000 });
        
        // Verify English
        const enText = await page.locator('body').innerText();
        expect(enText.includes('Settings') || enText.includes('Overview')).toBe(true);
      } else {
        test.skip(true, 'Language switcher not found');
      }
    });
  });

  test('onboarding guide shows correct language', async ({ page, baseURL }) => {
    const base = baseURL || process.env.BASE_URL || 'https://www.klarpakke.no';

    await test.step('Check English guide', async () => {
      await page.goto(`${base}/en/dashboard/guide`);
      await page.waitForLoadState('networkidle');
      
      const content = await page.locator('body').innerText();
      
      // English guide specific content
      expect(content).toContain('Choose mode');
      expect(content).toContain('Paper or Live');
      
      // Should not have Norwegian
      expect(content).not.toContain('Velg modus');
      expect(content).not.toContain('Paper eller Live');
    });

    await test.step('Check Norwegian guide', async () => {
      await page.goto(`${base}/no/dashboard/guide`);
      await page.waitForLoadState('networkidle');
      
      const content = await page.locator('body').innerText();
      
      // Norwegian guide specific content
      expect(content).toContain('Velg modus');
      expect(content).toContain('Paper eller Live');
    });
  });
});
