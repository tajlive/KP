/**
 * @critical @security
 * Test: Bruker B kan IKKE se Bruker A sin sesjon
 */

import { test, expect } from '@playwright/test';

test.describe('Security & Isolation @critical', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Fresh context per test

  test('user B cannot access user A session', async ({ browser, baseURL }) => {
    const base = baseURL || process.env.BASE_URL || 'https://www.klarpakke.no';
    let sessionId: string | null = null;

    // Skip if missing test credentials
    test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD, 
      'TEST_USER_EMAIL and TEST_USER_PASSWORD required');

    // Step 1: User A creates a session
    await test.step('User A: Create session', async () => {
      const userAContext = await browser.newContext();
      const userAPage = await userAContext.newPage();

      // Login as User A
      await userAPage.goto(`${base}/no/innlogging`);
      await userAPage.getByLabel(/e-post|email/i).fill(process.env.TEST_USER_EMAIL!);
      await userAPage.getByLabel(/passord|password/i).fill(process.env.TEST_USER_PASSWORD!);
      await userAPage.getByRole('button', { name: /logg inn|sign in/i }).click();
      await userAPage.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

      // Create paper trading session
      await userAPage.goto(`${base}/no/paper-trading`);
      await userAPage.getByRole('button', { name: /start ny|ny sesjon/i }).click();
      await userAPage.waitForTimeout(500);
      await userAPage.getByRole('button', { name: /start|oppret/i }).click();
      await userAPage.waitForURL(/\/paper-trading\/[0-9a-f-]{36}/, { timeout: 15000 });

      // Extract session ID
      const url = userAPage.url();
      const match = url.match(/\/paper-trading\/([0-9a-f-]{36})/);
      sessionId = match ? match[1] : null;
      expect(sessionId).toBeTruthy();

      await userAContext.close();
    });

    // Step 2: User B tries to access User A's session
    await test.step('User B: Attempt to access User A session', async () => {
      const userBContext = await browser.newContext();
      const userBPage = await userBContext.newPage();

      // Try to access session directly without login
      await userBPage.goto(`${base}/no/paper-trading/${sessionId}`);
      
      // Should redirect to login or show 404
      await userBPage.waitForLoadState('networkidle');
      
      const url = userBPage.url();
      const content = await userBPage.content();
      
      // Verify one of: redirect to login, 404, or access denied
      const isLoginRedirect = url.includes('innlogging') || url.includes('auth') || url.includes('login');
      const is404 = content.toLowerCase().includes('404') || 
                    content.toLowerCase().includes('not found') ||
                    content.toLowerCase().includes('ikke funnet');
      const isAccessDenied = content.toLowerCase().includes('access denied') ||
                             content.toLowerCase().includes('ingen tilgang') ||
                             content.toLowerCase().includes('forbidden');
      
      expect(isLoginRedirect || is404 || isAccessDenied, 
        `Expected redirect to login or 404, got URL: ${url}`).toBe(true);

      await userBContext.close();
    });

    // Step 3: User B (logged in) tries to access User A's session
    await test.step('User B (authenticated): Attempt to access User A session', async () => {
      // Skip if no secondary user available
      test.skip(!process.env.TEST_USER_B_EMAIL || !process.env.TEST_USER_B_PASSWORD,
        'TEST_USER_B_EMAIL and TEST_USER_B_PASSWORD required for this test');

      const userBContext = await browser.newContext();
      const userBPage = await userBContext.newPage();

      // Login as User B
      await userBPage.goto(`${base}/no/innlogging`);
      await userBPage.getByLabel(/e-post|email/i).fill(process.env.TEST_USER_B_EMAIL!);
      await userBPage.getByLabel(/passord|password/i).fill(process.env.TEST_USER_B_PASSWORD!);
      await userBPage.getByRole('button', { name: /logg inn|sign in/i }).click();
      await userBPage.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

      // Try to access User A's session
      await userBPage.goto(`${base}/no/paper-trading/${sessionId}`);
      await userBPage.waitForLoadState('networkidle');

      const url = userBPage.url();
      const content = await userBPage.content();

      // Verify 404 or redirect (not the actual session data)
      const is404 = content.toLowerCase().includes('404') || 
                    content.toLowerCase().includes('not found') ||
                    content.toLowerCase().includes('ikke funnet');
      const redirectedToList = url.includes('/paper-trading') && !url.includes(sessionId!);
      const showsAccessDenied = content.toLowerCase().includes('access denied') ||
                                content.toLowerCase().includes('ingen tilgang');

      expect(is404 || redirectedToList || showsAccessDenied,
        `User B should not see User A session. URL: ${url}`).toBe(true);

      // Verify NO session data from User A is visible
      await expect(userBPage.getByText(/BTC.*USDT.*10\s?000/i).first()).not.toBeVisible();

      await userBContext.close();
    });

    console.log(`✅ Security test passed - session ${sessionId} was properly isolated`);
  });

  test('unauthenticated user cannot access protected routes', async ({ page, baseURL }) => {
    const base = baseURL || process.env.BASE_URL || 'https://www.klarpakke.no';

    const protectedRoutes = [
      '/no/dashboard',
      '/no/paper-trading',
      '/no/admin',
      '/no/innstillinger'
    ];

    for (const route of protectedRoutes) {
      await test.step(`Check ${route}`, async () => {
        await page.goto(`${base}${route}`);
        await page.waitForLoadState('networkidle');

        const url = page.url();
        
        // Should redirect to login
        expect(url.includes('innlogging') || url.includes('login') || url.includes('auth')).toBe(true);
      });
    }
  });
});
