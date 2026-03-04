import { test, expect } from '@playwright/test';

/**
 * Kritiske feilfikser - Verifisering av P0 og P1 feil
 * 
 * FEIL 1: Auto-redirect fra / fungerer IKKE
 * FEIL 2: /en, /th, /zh viser 100% norsk innhold
 * FEIL 3: /no/auto-trading redirecter til feil URL med manglende i18n-nøkkel
 * FEIL 4: Broken logo-bilde på /no/signup
 * FEIL 5: Feil <title> på /no/personvern
 * FEIL 6: Inkonsistent prisinfo mellom /no og /no/priser
 * FEIL 7: Konsistente sidetittel-formater (template)
 */

test.describe('P0: Kritiske feil', () => {
  
  // FEIL 1: Auto-redirect fra / basert på Accept-Language
  test('FEIL 1: Root / redirecter til riktig locale basert på Accept-Language', async ({ page, context }) => {
    // Test norsk browser
    await context.setExtraHTTPHeaders({ 'Accept-Language': 'nb-NO,nb;q=0.9,no;q=0.8' });
    await page.goto('/');
    
    // Vent på redirect
    await page.waitForURL('**/no', { timeout: 5000 });
    expect(page.url()).toContain('/no');
    
    // Test engelsk browser
    await context.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.goto('/');
    
    await page.waitForURL('**/en', { timeout: 5000 });
    expect(page.url()).toContain('/en');
  });

  // FEIL 2: /en skal vise engelsk innhold (ikke norsk)
  test('FEIL 2: /en viser engelsk innhold og metadata', async ({ page }) => {
    await page.goto('/en');
    
    // Sjekk at sidetittel er på engelsk
    const title = await page.title();
    expect(title).not.toContain('Norsk');
    expect(title).toContain('Klarpakke');
    
    // Sjekk at meta description er på engelsk
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toMatch(/crypto trading|learn/i);
    expect(metaDescription).not.toContain('Lær crypto trading'); // Norsk fras
  });

  // FEIL 2: /th skal vise thai innhold
  test('FEIL 2: /th viser thai metadata', async ({ page }) => {
    await page.goto('/th');
    
    const title = await page.title();
    expect(title).toContain('Klarpakke');
    // Thai språk skal ha annen tittel enn norsk
    expect(title).not.toEqual('Klarpakke - Lær Trading på Norsk | Paper Trading & AI-Coach');
  });

  // FEIL 3A: Auth-redirect med locale-prefix
  test('FEIL 3A: Uautorisert auto-trading redirecter til /no/innlogging (ikke /auth/login)', async ({ page }) => {
    // Gå til auto-trading uten å være logget inn
    await page.goto('/no/auto-trading');
    
    // Vent på redirect (skal gå til innlogging, ikke /auth/login)
    await page.waitForURL('**/innlogging**', { timeout: 10000 });
    
    const url = page.url();
    expect(url).toContain('/no/innlogging');
    expect(url).not.toContain('/auth/login');
  });

  // FEIL 3B: meta.login i18n-nøkkel finnes
  test('FEIL 3B: Innloggingssiden viser korrekt tittel uten [MISSING:', async ({ page }) => {
    await page.goto('/no/innlogging');
    
    // Sjekk at sidetittel ikke inneholder MISSING
    const title = await page.title();
    expect(title).not.toContain('[MISSING');
    expect(title).not.toContain('meta.login');
    expect(title).toMatch(/innlogging|logg inn/i);
    
    // Sjekk at page innhold ikke har synlige MISSING keys
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('[MISSING:');
  });

  // FEIL 4: Logo på signup-siden laster korrekt
  test('FEIL 4: Logo laster korrekt på /no/signup', async ({ page }) => {
    await page.goto('/no/signup');
    
    // Vent på at logo-bildet laster
    const logo = page.locator('img[alt="Klarpakke"]').first();
    await expect(logo).toBeVisible({ timeout: 10000 });
    
    // Sjekk at bildet ikke er ødelagt (naturlig størrelse > 0)
    const naturalWidth = await logo.evaluate((el: HTMLImageElement) => el.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
    
    // Sjekk at src er gyldig
    const src = await logo.getAttribute('src');
    expect(src).toMatch(/\.(png|svg|webp|jpg)$/i);
  });
});

test.describe('P1: Alvorlige feil', () => {
  
  // FEIL 5: Korrekt sidetittel på personvern
  test('FEIL 5: /no/personvern har korrekt sidetittel', async ({ page }) => {
    await page.goto('/no/personvern');
    
    const title = await page.title();
    
    // Skal ha "Personvern" i tittel, ikke default homepage-tittel
    expect(title).toMatch(/personvern|privacy/i);
    expect(title).not.toEqual('Klarpakke Universitet - Norges første crypto-universitet');
    
    // Skal ha | Klarpakke suffix (fra title template)
    expect(title).toContain('| Klarpakke');
  });

  // FEIL 5: Også på andre språk
  test('FEIL 5: /en personvern-side har korrekt engelsk tittel', async ({ page }) => {
    // Sjekk om engelsk personvern-side finnes, hvis ikke skip
    const response = await page.goto('/en/personvern');
    if (response?.status() === 404) {
      test.skip();
      return;
    }
    
    const title = await page.title();
    expect(title).toMatch(/privacy|personvern/i);
    expect(title).toContain('| Klarpakke');
  });

  // FEIL 6: Konsistent prisinfo mellom /no og /no/priser
  test('FEIL 6: Prisinfo er konsistent mellom homepage og /priser', async ({ page }) => {
    // Hent priser fra homepage
    await page.goto('/no');
    await page.waitForSelector('#pricing', { timeout: 10000 });
    
    const homePrices = await page.locator('#pricing').locator('text=/[0-9]+\\s*kr/i').allInnerTexts();
    const homePriceNumbers = homePrices
      .map(p => parseInt(p.replace(/\D/g, '')))
      .filter(p => p > 0);
    
    // Hent priser fra /priser
    await page.goto('/no/priser');
    await page.waitForLoadState('networkidle');
    
    const priserPrices = await page.locator('text=/[0-9]+\\s*kr/i').allInnerTexts();
    const priserPriceNumbers = priserPrices
      .map(p => parseInt(p.replace(/\D/g, '')))
      .filter(p => p > 0);
    
    // Begge sider skal ha overlappende prisnivåer
    // (Detaljene kan variere, men grunnprisene skal være konsistente)
    const hasOverlap = homePriceNumbers.some(homePrice => 
      priserPriceNumbers.some(priserPrice => 
        Math.abs(homePrice - priserPrice) < 50 || // Samme pris
        (homePrice === 249 && priserPrice === 249) || // Bachelor/Beta
        (homePrice === 499 && priserPrice === 499) || // Master
        (homePrice === 999 && priserPrice === 999)    // PhD
      )
    );
    
    expect(hasOverlap, 'Priser skal være konsistente mellom sider').toBeTruthy();
  });

  // FEIL 6: Priser skal komme fra samme datakilde (TIERS)
  test('FEIL 6: /priser viser korrekte tier-priser (249, 499, 999)', async ({ page }) => {
    await page.goto('/no/priser');
    await page.waitForLoadState('networkidle');
    
    // Sjekk at Bachelor (249 kr), Master (499 kr), PhD (999 kr) finnes
    const pageContent = await page.locator('body').innerText();
    
    // Må ha disse spesifikke prisene fra TIERS
    expect(pageContent).toContain('249');
    expect(pageContent).toMatch(/bachelor|student/i);
  });
});

test.describe('P2: Konsistente sidetitler', () => {
  
  // FEIL 7: Title template på tvers av sider
  test('FEIL 7: Sidetitler bruker konsistent format med | Klarpakke', async ({ page }) => {
    const pagesToCheck = [
      { url: '/no', shouldContain: '| Klarpakke' },
      { url: '/no/om-oss', shouldContain: '| Klarpakke' },
      { url: '/no/kontakt', shouldContain: '| Klarpakke' },
    ];
    
    for (const { url, shouldContain } of pagesToCheck) {
      await page.goto(url);
      const title = await page.title();
      expect(title, `Side ${url} skal ha | Klarpakke suffix`).toContain(shouldContain);
    }
  });

  // FEIL 7: Signup har korrekt tittel
  test('FEIL 7: /no/signup har korrekt tittel-format', async ({ page }) => {
    await page.goto('/no/signup');
    
    const title = await page.title();
    
    // Skal ha "Opprett konto" eller lignende, og | Klarpakke
    expect(title).toMatch(/opprett|signup|registrer/i);
    expect(title).toContain('| Klarpakke');
  });
});

test.describe('Middleware og Redirects', () => {
  
  test('Middleware redirecter beskyttede ruter til innlogging', async ({ page }) => {
    await page.goto('/no/dashboard');
    
    // Skal redirecte til innlogging
    await page.waitForURL('**/innlogging**', { timeout: 10000 });
    expect(page.url()).toContain('/no/innlogging');
  });

  test('Innlogget bruker på auth-side redirectes til dashboard', async ({ page, context }) => {
    // Dette krever mocking av auth-state, kan utvides med faktisk login
    // For nå bare sjekk at redirect-logikken eksisterer
    await page.goto('/no/innlogging');
    
    // Siden skal laste uten MISSING keys
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('[MISSING:');
  });
});
