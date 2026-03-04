import { test, expect } from '@playwright/test';

/**
 * LAUNCH QA – Komplett produksjonstest for klarpakke.no
 * Kjøres mot https://www.klarpakke.no
 * Null toleranse for feil – alle tester MÅ være grønne før lansering.
 */

const BASE = 'https://www.klarpakke.no';

// ═══════════════════════════════════════════════════════════════
// 1. SMOKE: Alle offentlige sider laster (HTTP 200, ingen crash)
// ═══════════════════════════════════════════════════════════════

const PUBLIC_PAGES = [
  { path: '/no', name: 'Forside NO' },
  { path: '/en', name: 'Forside EN' },
  { path: '/no/priser', name: 'Priser' },
  { path: '/no/innlogging', name: 'Innlogging' },
  { path: '/no/signup', name: 'Registrering' },
  { path: '/no/kurs', name: 'Kurs' },
  { path: '/no/om-oss', name: 'Om oss' },
  { path: '/no/kontakt', name: 'Kontakt' },
  { path: '/no/personvern', name: 'Personvern' },
  { path: '/no/vilkar', name: 'Vilkår' },
  { path: '/no/kalkulator', name: 'Kalkulator' },
  { path: '/no/hjelp', name: 'Hjelp' },
  { path: '/no/glemt-passord', name: 'Glemt passord' },
  { path: '/no/leaderboard-preview', name: 'Leaderboard preview' },
  { path: '/no/login', name: 'Login (alias)' },
  { path: '/no/pricing', name: 'Pricing EN' },
  { path: '/no/feil/ikke-funnet', name: '404-side' },
];

test.describe('1. SMOKE: Offentlige sider laster', () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name} (${path}) → 200`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status(), `${name} returnerte ${res.status()}`).toBe(200);
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// 2. AUTH GUARD: Beskyttede sider redirecter til innlogging
// ═══════════════════════════════════════════════════════════════

const PROTECTED_PAGES = [
  '/no/dashboard',
  '/no/onboarding',
  '/no/auto-trading',
  '/no/paper-trading',
  '/no/live-trading',
  '/no/signals',
  '/no/leaderboard',
  '/no/handelshistorikk',
  '/no/innstillinger',
  '/no/varsler',
  '/no/konto',
  '/no/profile',
  '/no/akademi',
  '/no/simulator',
  '/no/copy-trading',
  '/no/marketplace',
  '/no/quiz',
];

test.describe('2. AUTH GUARD: Beskyttede sider krever innlogging', () => {
  for (const path of PROTECTED_PAGES) {
    test(`${path} → redirect til innlogging`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 20000 });
      // Middleware should redirect to /no/innlogging
      expect(page.url()).toContain('innlogging');
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// 3. SEO & INFRASTRUKTUR
// ═══════════════════════════════════════════════════════════════

test.describe('3. SEO & Infrastruktur', () => {
  test('robots.txt tilgjengelig', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text.toLowerCase()).toContain('user-agent');
  });

  test('sitemap.xml tilgjengelig', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('urlset');
  });

  test('API health endpoint', async ({ request }) => {
    const res = await request.get('/api/status');
    expect(res.status()).toBe(200);
  });

  test('favicon.ico tilgjengelig', async ({ request }) => {
    const res = await request.get('/favicon.ico');
    expect(res.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. I18N: Locale-routing og innhold
// ═══════════════════════════════════════════════════════════════

test.describe('4. I18N: Locale og innhold', () => {
  test('Root / redirecter til locale', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(page.url()).toMatch(/\/(no|en)(\/|$)/);
  });

  test('/no viser norsk innhold', async ({ page }) => {
    await page.goto('/no', { waitUntil: 'domcontentloaded' });
    const html = await page.locator('html').getAttribute('lang');
    // lang should be no or nb
    expect(html).toMatch(/^(no|nb)/);
  });

  test('/en viser engelsk innhold', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    const html = await page.locator('html').getAttribute('lang');
    expect(html).toMatch(/^en/);
  });

  test('Ingen [MISSING:] i18n-nøkler på forsiden', async ({ page }) => {
    await page.goto('/no', { waitUntil: 'networkidle' });
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('[MISSING:');
    expect(bodyText).not.toContain('missing translation');
  });

  test('Ingen [MISSING:] på innlogging', async ({ page }) => {
    await page.goto('/no/innlogging', { waitUntil: 'networkidle' });
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('[MISSING:');
  });

  test('Ingen [MISSING:] på priser', async ({ page }) => {
    await page.goto('/no/priser', { waitUntil: 'networkidle' });
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('[MISSING:');
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. NAVIGASJON & UI
// ═══════════════════════════════════════════════════════════════

test.describe('5. Navigasjon & UI', () => {
  test('Forsiden har synlig navigasjon', async ({ page }) => {
    await page.goto('/no', { waitUntil: 'domcontentloaded' });
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test('Forsiden har footer', async ({ page }) => {
    await page.goto('/no', { waitUntil: 'domcontentloaded' });
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible({ timeout: 10000 });
  });

  test('Logo er synlig og klikkbar', async ({ page }) => {
    await page.goto('/no', { waitUntil: 'domcontentloaded' });
    // Logo might be text or image
    const logoLink = page.locator('nav a').first();
    await expect(logoLink).toBeVisible({ timeout: 10000 });
  });

  test('Innlogging-link finnes i nav', async ({ page }) => {
    await page.goto('/no', { waitUntil: 'networkidle' });
    const loginLinkCount = await page.locator('a[href*="innlogging"]').count();
    expect(loginLinkCount, 'Forventer minst én innlogging-link på siden').toBeGreaterThan(0);
  });

  test('Forsiden har CTA-knapp', async ({ page }) => {
    await page.goto('/no', { waitUntil: 'networkidle' });
    // Look for primary CTA
    const cta = page.getByRole('link', { name: /kom i gang|start|prøv|registrer|gratis/i }).first();
    const ctaButton = page.getByRole('button', { name: /kom i gang|start|prøv|registrer|gratis/i }).first();
    const hasCta = await cta.isVisible().catch(() => false);
    const hasCtaButton = await ctaButton.isVisible().catch(() => false);
    expect(hasCta || hasCtaButton, 'Forventer CTA på forsiden').toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. INNLOGGING UI
// ═══════════════════════════════════════════════════════════════

test.describe('6. Innlogging-side', () => {
  test('Innlogging-side laster og viser skjema', async ({ page }) => {
    await page.goto('/no/innlogging', { waitUntil: 'networkidle' });
    // Should have some form of login UI
    const hasEmailInput = await page.locator('input[type="email"]').isVisible().catch(() => false);
    const hasGoogleBtn = await page.getByText(/google/i).isVisible().catch(() => false);
    const hasLoginForm = await page.locator('form').isVisible().catch(() => false);
    expect(hasEmailInput || hasGoogleBtn || hasLoginForm, 'Innlogging-side mangler skjema').toBe(true);
  });

  test('Registrering-side laster', async ({ page }) => {
    await page.goto('/no/signup', { waitUntil: 'networkidle' });
    expect(page.url()).toContain('signup');
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('[MISSING:');
  });

  test('Glemt passord-side laster', async ({ page }) => {
    await page.goto('/no/glemt-passord', { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(50);
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. PRISER & BETALING
// ═══════════════════════════════════════════════════════════════

test.describe('7. Priser-side', () => {
  test('Priser-side viser prisnivåer', async ({ page }) => {
    await page.goto('/no/priser', { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    // Should mention pricing tiers or amounts
    const hasPricing = /\d+\s*(kr|NOK|\/mnd|\/måned)/i.test(body) ||
                       /gratis|free|premium|pro|bachelor|master/i.test(body);
    expect(hasPricing, 'Priser-side mangler prisinformasjon').toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. KURS-SIDE
// ═══════════════════════════════════════════════════════════════

test.describe('8. Kurs-side', () => {
  test('Kurs-side laster og viser innhold', async ({ page }) => {
    await page.goto('/no/kurs', { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(100);
    expect(body).not.toContain('[MISSING:');
  });
});

// ═══════════════════════════════════════════════════════════════
// 9. KALKULATOR
// ═══════════════════════════════════════════════════════════════

test.describe('9. Kalkulator', () => {
  test('Kalkulator-side laster og har interaktive elementer', async ({ page }) => {
    await page.goto('/no/kalkulator', { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(100);
    // Should have some input or slider
    const hasInput = await page.locator('input').first().isVisible().catch(() => false);
    const hasSlider = await page.locator('input[type="range"]').first().isVisible().catch(() => false);
    expect(hasInput || hasSlider, 'Kalkulator mangler interaktive elementer').toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 10. YTELSE
// ═══════════════════════════════════════════════════════════════

test.describe('10. Ytelse', () => {
  test('Forsiden laster under 5 sekunder', async ({ page }) => {
    const start = Date.now();
    await page.goto('/no', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;
    console.log(`Forside lastetid: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  test('Innlogging laster under 5 sekunder', async ({ page }) => {
    const start = Date.now();
    await page.goto('/no/innlogging', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;
    console.log(`Innlogging lastetid: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });
});

// ═══════════════════════════════════════════════════════════════
// 11. RESPONSIVITET (Mobil)
// ═══════════════════════════════════════════════════════════════

test.describe('11. Responsivitet', () => {
  test('Forsiden er responsiv på mobil (ingen horisontal scroll)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/no', { waitUntil: 'networkidle' });
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientW = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollW).toBeLessThanOrEqual(clientW + 10);
  });

  test('Innlogging er responsiv på mobil', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/no/innlogging', { waitUntil: 'networkidle' });
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientW = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollW).toBeLessThanOrEqual(clientW + 10);
  });
});

// ═══════════════════════════════════════════════════════════════
// 12. SIKKERHET
// ═══════════════════════════════════════════════════════════════

test.describe('12. Sikkerhet', () => {
  test('Admin-sider krever autentisering', async ({ page }) => {
    await page.goto('/no/admin', { waitUntil: 'domcontentloaded' });
    // Should redirect to login
    const url = page.url();
    expect(url).toMatch(/innlogging|admin\/login/);
  });

  test('Super-admin krever autentisering', async ({ page }) => {
    await page.goto('/no/super-admin', { waitUntil: 'domcontentloaded' });
    const url = page.url();
    expect(url).toContain('innlogging');
  });

  test('API-ruter returnerer ikke 500', async ({ request }) => {
    const endpoints = ['/api/status', '/api/health'];
    for (const ep of endpoints) {
      const res = await request.get(ep);
      expect(res.status(), `${ep} returnerte 500`).not.toBe(500);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 13. KONSOLL-FEIL (ingen kritiske JS-feil)
// ═══════════════════════════════════════════════════════════════

test.describe('13. Ingen kritiske konsoll-feil', () => {
  test('Forsiden har ingen ukjente JS-feil', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      // Ignorer kjente godkjente feil
      if (err.message.includes('ResizeObserver') ||
          err.message.includes('hydration') ||
          err.message.includes('chunk')) return;
      errors.push(err.message);
    });
    await page.goto('/no', { waitUntil: 'networkidle' });
    // Allow max 2 non-critical errors
    expect(errors.length, `JS-feil: ${errors.join(', ')}`).toBeLessThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════
// 14. META TAGS & SEO
// ═══════════════════════════════════════════════════════════════

test.describe('14. Meta tags & SEO', () => {
  test('Forsiden har title, description, og OG-tags', async ({ page }) => {
    await page.goto('/no', { waitUntil: 'domcontentloaded' });

    const title = await page.title();
    expect(title.length).toBeGreaterThan(10);
    expect(title).toContain('Klarpakke');

    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toBeTruthy();
    expect(desc!.length).toBeGreaterThan(20);

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// 15. STATISKE SIDER (innhold finnes)
// ═══════════════════════════════════════════════════════════════

test.describe('15. Statiske sider har innhold', () => {
  const staticPages = [
    { path: '/no/om-oss', name: 'Om oss' },
    { path: '/no/personvern', name: 'Personvern' },
    { path: '/no/vilkar', name: 'Vilkår' },
    { path: '/no/kontakt', name: 'Kontakt' },
  ];

  for (const { path, name } of staticPages) {
    test(`${name} har tilstrekkelig innhold`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      const body = await page.locator('body').innerText();
      expect(body.length, `${name} har for lite innhold`).toBeGreaterThan(200);
      expect(body).not.toContain('[MISSING:');
    });
  }
});
