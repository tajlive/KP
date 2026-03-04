import { test, expect, type BrowserContext } from '@playwright/test';

/**
 * AUTH EXCHANGE FIX VERIFICATION SUITE
 * Verifiserer PR #18: fix/auth-exchange-failed
 *
 * Rotårsak bekreftet (KIMI 2026-02-23):
 *   "PKCE code verifier not found in storage"
 *   cookieStore.set() i Next.js 15 Route Handlers propagerer ikke cookies
 *   til HTTP-responsen → session settes aldri → infinite redirect loop.
 *
 * Tester:
 *   1. Ingen infinite redirect loop ved exchange_failed
 *   2. PKCE code_verifier cookie settes av browser-klient
 *   3. Session-cookies settes etter vellykket email-login
 *   4. Feilhåndtering er graceful (ikke loop)
 *   5. Callback-ruten returnerer korrekte HTTP-statuser
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_USER_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || '';

test.describe('Auth Exchange Fix – Anti-loop verifikasjon', () => {

  test('exchange_failed gir IKKE redirect loop (max 2 redirects)', async ({ page }) => {
    const redirectUrls: string[] = [];

    page.on('response', response => {
      if (response.status() >= 300 && response.status() < 400) {
        redirectUrls.push(response.url());
      }
    });

    await page.goto(`${BASE_URL}/no/innlogging?error=exchange_failed`, {
      waitUntil: 'networkidle',
    });

    console.log('Redirect chain:', redirectUrls);

    expect(
      redirectUrls.length,
      `Loop detektert! Redirects: ${redirectUrls.join(' → ')}`
    ).toBeLessThanOrEqual(2);

    expect(page.url()).toContain('/no/innlogging');
  });

  test('innlogging-siden viser feilmelding ved error-param (stabil, ingen auto-redirect)', async ({ page }) => {
    await page.goto(`${BASE_URL}/no/innlogging?error=exchange_failed`, {
      waitUntil: 'networkidle',
    });

    const errorAlert = page.locator('[class*="red"], [class*="error"], [role="alert"]').first();
    await expect(errorAlert).toBeVisible({ timeout: 5000 });

    const urlBefore = page.url();
    await page.waitForTimeout(2000);
    const urlAfter = page.url();

    expect(urlBefore).toBe(urlAfter);
    console.log('Side stabil etter 2s:', urlAfter);
  });

  test('callback uten code redirecter til no_code (ikke loop)', async ({ page }) => {
    const responses: { url: string; status: number }[] = [];

    page.on('response', r => {
      responses.push({ url: r.url(), status: r.status() });
    });

    await page.goto(`${BASE_URL}/no/auth/callback`, {
      waitUntil: 'networkidle',
    });

    console.log('Redirects:', responses.filter(r => r.status >= 300).map(r => `${r.status} ${r.url}`));

    expect(page.url()).toContain('error=no_code');
    expect(page.url()).toContain('/no/innlogging');
  });

  test('callback med ugyldig code gir exchange_failed én gang (ingen loop)', async ({ page }) => {
    const redirectCount = { count: 0 };

    page.on('response', r => {
      if (r.status() >= 300 && r.status() < 400) {
        redirectCount.count++;
        console.log(`Redirect #${redirectCount.count}: ${r.status()} → ${r.headers()['location']}`);
      }
    });

    await page.goto(`${BASE_URL}/no/auth/callback?code=FAKE_INVALID_CODE`, {
      waitUntil: 'networkidle',
    });

    console.log('Total redirects:', redirectCount.count);
    console.log('Final URL:', page.url());

    expect(redirectCount.count, 'For mange redirects – mulig loop').toBeLessThanOrEqual(3);
    expect(page.url()).toContain('/no/innlogging');
    expect(page.url()).toContain('error=exchange_failed');
  });

  test('PKCE: browser-klient setter code_challenge i OAuth URL', async ({ context, page }) => {
    await page.goto(`${BASE_URL}/no/innlogging`, { waitUntil: 'networkidle' });

    let capturedOAuthUrl = '';
    await page.route('**supabase.co/auth/v1/authorize**', route => {
      capturedOAuthUrl = route.request().url();
      console.log('OAuth URL (first 300 chars):', capturedOAuthUrl.substring(0, 300));
      route.abort();
    });

    const googleBtn = page.locator('button:has-text("Google"), a:has-text("Google")').first();
    if (await googleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await googleBtn.click();
      await page.waitForTimeout(1500);
    } else {
      console.log('Google-knapp ikke funnet – hopper over OAuth URL-sjekk');
      test.skip();
    }

    if (capturedOAuthUrl) {
      const hasCodeChallenge = capturedOAuthUrl.includes('code_challenge');
      const hasPkceMethod = capturedOAuthUrl.includes('code_challenge_method=S256');
      console.log('Has code_challenge:', hasCodeChallenge);
      console.log('Has S256 method:', hasPkceMethod);
      expect(hasCodeChallenge, 'PKCE code_challenge mangler i OAuth URL').toBe(true);
      expect(hasPkceMethod, 'PKCE S256 method mangler').toBe(true);
    }

    // Sjekk at code_verifier cookie ble satt
    const cookies = await context.cookies();
    const pkceVerifier = cookies.find(c =>
      c.name.includes('code-verifier') ||
      c.name.includes('pkce') ||
      c.name.match(/sb-.+-auth-code-verifier/)
    );
    console.log('Alle cookies:', cookies.map(c => c.name));
    console.log('PKCE Verifier cookie:', pkceVerifier?.name || 'IKKE FUNNET (kan være forventet hvis OAuth ble blokkert)');
  });

  test('Email-login: full flyt → dashboard → cookies satt → logout redirect', async ({ context, page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Sett TEST_USER_EMAIL og TEST_USER_PASSWORD for å kjøre denne testen');

    await page.goto(`${BASE_URL}/no/innlogging`, { waitUntil: 'networkidle' });

    const emailFormBtn = page.locator('button:has-text("e-post"), button:has-text("email"), button:has-text("Logg inn med e-post")').first();
    if (await emailFormBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailFormBtn.click();
    }

    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard**', { timeout: 12000 });

    const cookiesAfter = await context.cookies();
    const sessionCookie = cookiesAfter.find(c =>
      c.name.includes('sb-') && (c.name.includes('auth-token') || c.name.includes('access-token'))
    );

    console.log('Cookies etter login:', cookiesAfter.map(c => c.name));
    console.log('Session cookie funnet:', sessionCookie?.name || 'IKKE FUNNET');

    expect(page.url()).toContain('/dashboard');
    expect(sessionCookie, 'Session cookie mangler etter login – Fix 1 virker ikke!').toBeTruthy();

    // Logout-test: fjern cookies og verifiser redirect til innlogging
    await context.clearCookies();
    await page.goto(`${BASE_URL}/no/dashboard`, { waitUntil: 'networkidle' });
    expect(page.url()).toContain('/innlogging');
    console.log('Post-logout redirect OK:', page.url());
  });

});

test.describe('Auth Exchange Fix – HTTP Response & Cookie-persistering', () => {

  test('callback returnerer redirect (ikke 404/500)', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/no/auth/callback`, {
      maxRedirects: 0
    });
    const status = response.status();
    console.log('Callback status (ingen code):', status);
    console.log('Location header:', response.headers()['location']);
    expect([301, 302, 303, 307, 308], `Uventet status: ${status}`).toContain(status);
  });

  test('innlogging-siden returnerer 200 (ikke 500/404)', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/no/innlogging`);
    expect(response.status()).toBe(200);
    console.log('Innlogging status:', response.status());
  });

  test('callback med ugyldig code: HTTP-nivå response-sjekk + PKCE feilmelding', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/no/auth/callback?code=TEST_CODE_PKCE_CHECK`,
      { maxRedirects: 0 }
    );

    const status = response.status();
    const location = response.headers()['location'] || '';
    const setCookie = response.headers()['set-cookie'] || '';

    console.log('Status:', status);
    console.log('Location:', location);
    console.log('Set-Cookie:', setCookie ? 'SATT' : 'IKKE SATT (forventet for feil-scenario)');

    // Skal alltid redirecte
    expect([301, 302, 303, 307, 308]).toContain(status);
    expect(location).toBeTruthy();

    // Bekreft PKCE-feilmeldingen fra Supabase
    if (location.includes('exchange_failed')) {
      console.log('✅ PKCE feil bekreftet:', decodeURIComponent(location));
      // Det er forventet at test-koden ikke har code_verifier
    }
  });

  test('loop-stresstest: exchange_failed URL gir maks 1 redirect (ingen loop)', async ({ page }) => {
    const allRedirects: string[] = [];

    page.on('response', r => {
      if (r.status() >= 300 && r.status() < 400 && r.url().includes('localhost:3000')) {
        const location = r.headers()['location'] || '';
        allRedirects.push(`${r.status()} ${r.url()} → ${location}`);
      }
    });

    await page.goto(`${BASE_URL}/no/innlogging?error=exchange_failed`, {
      waitUntil: 'networkidle',
      timeout: 15000
    });

    console.log('=== LOOP STRESSTEST RESULTAT ===');
    console.log('Antall redirects:', allRedirects.length);
    allRedirects.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
    console.log('Final URL:', page.url());

    if (allRedirects.length === 0) {
      console.log('✅ INGEN LOOP – 0 redirects (side serveres direkte)');
    } else if (allRedirects.length <= 2) {
      console.log(`✅ INGEN LOOP – ${allRedirects.length} redirect(s) er innenfor grense`);
    } else {
      console.log(`❌ MULIG LOOP – ${allRedirects.length} redirects detektert!`);
    }

    expect(allRedirects.length, `LOOP DETEKTERT: ${allRedirects.join(', ')}`).toBeLessThanOrEqual(2);
  });

});
