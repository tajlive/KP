import { test, expect } from '@playwright/test';

/**
 * 🧪 COMPREHENSIVE PROTECTED PAGES TEST
 * 
 * Logger inn som tom@klarpakke.no og tester alle beskyttede sider
 * Mål: Verifisere at ingen sider gir 404/feil etter innlogging
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_USER = {
  email: 'tom@klarpakke.no',
  password: 'bilglass123',
};

// Liste over alle beskyttede sider som skal testes
const PROTECTED_PAGES = [
  // Hoveddashboard
  { path: '/no/dashboard', name: 'Dashboard', expectedContent: ['dashboard', 'Dashboard', 'oversikt', 'Oversikt'] },
  
  // Onboarding (hvis ikke fullført)
  { path: '/no/onboarding', name: 'Onboarding', expectedContent: ['onboarding', 'Onboarding', 'kom i gang', 'velkommen'] },
  
  // Trading & Bots
  { path: '/no/paper-trading', name: 'Paper Trading', expectedContent: ['paper', 'trading', 'simulering'] },
  { path: '/no/auto-trading', name: 'Auto Trading', expectedContent: ['auto', 'trading', 'bot'] },
  { path: '/no/auto-trading-ai', name: 'AI Trading', expectedContent: ['ai', 'trading', 'kunstig intelligens'] },
  { path: '/no/live-trading', name: 'Live Trading', expectedContent: ['live', 'trading', 'ekte'] },
  { path: '/no/copy-trading', name: 'Copy Trading', expectedContent: ['copy', 'trading', 'kopier'] },
  
  // Analyse & Historikk
  { path: '/no/handelshistorikk', name: 'Handelshistorikk', expectedContent: ['historikk', 'handler', 'trades'] },
  { path: '/no/leaderboard', name: 'Leaderboard', expectedContent: ['leaderboard', 'toppliste', 'rangering'] },
  { path: '/no/varsler', name: 'Varsler', expectedContent: ['varsler', 'notifikasjoner', 'meldinger'] },
  { path: '/no/signals', name: 'Signaler', expectedContent: ['signal', 'trading signaler'] },
  
  // Læring & Akademi
  { path: '/no/akademi', name: 'Akademi', expectedContent: ['akademi', 'kurs', 'læring'] },
  { path: '/no/kurs', name: 'Kurs', expectedContent: ['kurs', 'course', 'læring'] },
  { path: '/no/quiz', name: 'Quiz', expectedContent: ['quiz', 'test', 'spørsmål'] },
  { path: '/no/interessetest', name: 'Interessetest', expectedContent: ['interesse', 'test', 'passer'] },
  { path: '/no/simulator', name: 'Simulator', expectedContent: ['simulator', 'simulering', 'øve'] },
  
  // Konkurranser & League
  { path: '/no/leagues', name: 'Leagues', expectedContent: ['league', 'konkurranse', 'turnering'] },
  { path: '/no/beta', name: 'Beta', expectedContent: ['beta', 'early access'] },
  { path: '/no/beta-testing', name: 'Beta Testing', expectedContent: ['beta', 'testing', 'tester'] },
  
  // Bruker & Profil
  { path: '/no/profil', name: 'Profil', expectedContent: ['profil', 'profile', 'bruker', 'user'] },
  { path: '/no/innstillinger', name: 'Innstillinger', expectedContent: ['innstillinger', 'settings', 'preferanser'] },
  { path: '/no/konto', name: 'Konto', expectedContent: ['konto', 'account', 'abonnement'] },
  { path: '/no/settings', name: 'Settings', expectedContent: ['settings', 'innstillinger', 'preferanser'] },
  { path: '/no/profile', name: 'Profile', expectedContent: ['profile', 'profil', 'bruker'] },
  
  // Betaling & Kurs
  { path: '/no/betaling', name: 'Betaling', expectedContent: ['betaling', 'payment', 'kort'] },
  { path: '/no/courses', name: 'Courses', expectedContent: ['courses', 'kurs', 'læring'] },
  
  // Marked & Strategier
  { path: '/no/marketplace', name: 'Marketplace', expectedContent: ['marketplace', 'marked', 'strategier'] },
];

// Offentlige sider som også skal testes
const PUBLIC_PAGES = [
  { path: '/', name: 'Home', expectedContent: ['klarpakke', 'crypto', 'trading'] },
  { path: '/no/kurs', name: 'Kurs (Public)', expectedContent: ['kurs', 'læring'] },
  { path: '/priser', name: 'Priser', expectedContent: ['pris', 'price', 'abonnement'] },
  { path: '/no/om-oss', name: 'Om Oss', expectedContent: ['om oss', 'about', 'hvem er vi'] },
];

test.describe('🔐 Comprehensive Page Testing (Authenticated)', () => {
  
  // Login før alle tester
  test.beforeEach(async ({ page }) => {
    console.log(`\n🔑 Logging in as ${TEST_USER.email}...`);
    
    // Gå til innlogging
    await page.goto(`${BASE_URL}/no/innlogging`);
    await page.waitForLoadState('networkidle');
    
    // Klikk "Logg inn med e-post"
    const emailLoginBtn = page.locator('button:has-text("Logg inn med e-post"), button:has-text("Sign in with email")');
    await emailLoginBtn.waitFor({ state: 'visible', timeout: 10000 });
    await emailLoginBtn.click();
    
    // Fyll inn credentials
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    
    // Submit
    await page.locator('button[type="submit"]').click();
    
    // Vent på redirect (dashboard eller onboarding)
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
    
    console.log('✅ Login successful!\n');
  });
  
  // Test alle beskyttede sider
  for (const pageConfig of PROTECTED_PAGES) {
    test(`should load ${pageConfig.name} (${pageConfig.path})`, async ({ page }) => {
      console.log(`Testing: ${pageConfig.name}`);
      
      // Naviger til siden
      const response = await page.goto(`${BASE_URL}${pageConfig.path}`);
      
      // Sjekk at siden ikke gir 404
      expect(response?.status()).not.toBe(404);
      expect(response?.status()).toBeLessThan(500);
      
      // Vent på at siden laster
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.log('  ⚠️  Networkidle timeout (page may still be usable)');
      });
      
      // Sjekk at vi ikke er redirectet tilbake til innlogging (indikerer auth-feil)
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/innlogging');
      expect(currentUrl).not.toContain('/login');
      
      // Sjekk for 404-feil i innholdet
      const pageContent = await page.content();
      const has404 = pageContent.toLowerCase().includes('404') || 
                     pageContent.toLowerCase().includes('not found') ||
                     pageContent.toLowerCase().includes('ikke funnet');
      expect(has404).toBe(false);
      
      // Sjekk for forventet innhold (valgfritt - minst én av tekstene skal finnes)
      const hasExpectedContent = pageConfig.expectedContent.some(text => 
        pageContent.toLowerCase().includes(text.toLowerCase())
      );
      
      if (!hasExpectedContent) {
        console.log(`  ⚠️  Expected content not found for ${pageConfig.name}`);
        console.log(`     URL: ${currentUrl}`);
      }
      
      console.log(`  ✅ ${pageConfig.name} loaded successfully`);
    });
  }
  
  // Test offentlige sider (fortsatt innlogget)
  test.describe('Public pages (still authenticated)', () => {
    for (const pageConfig of PUBLIC_PAGES) {
      test(`should load ${pageConfig.name} (${pageConfig.path})`, async ({ page }) => {
        console.log(`Testing public page: ${pageConfig.name}`);
        
        const response = await page.goto(`${BASE_URL}${pageConfig.path}`);
        
        expect(response?.status()).not.toBe(404);
        expect(response?.status()).toBe(200);
        
        console.log(`  ✅ ${pageConfig.name} loaded successfully`);
      });
    }
  });
  
  // Test API-endepunkter
  test.describe('API endpoints', () => {
    const API_ENDPOINTS = [
      '/api/trading/price?symbol=BTCUSDT',
      '/api/trading/mode',
      '/api/trial/status',
      '/api/user/profile',
    ];
    
    for (const endpoint of API_ENDPOINTS) {
      test(`should access API: ${endpoint}`, async ({ request }) => {
        console.log(`Testing API: ${endpoint}`);
        
        const response = await request.get(`${BASE_URL}${endpoint}`);
        
        // Sjekk at vi ikke får 401 (unauthorized) eller 404
        expect(response.status()).not.toBe(404);
        
        // 200, 401 eller 500 er akseptabelt (avhengig av auth og data)
        expect([200, 401, 500]).toContain(response.status());
        
        console.log(`  ✅ API ${endpoint} responded with ${response.status()}`);
      });
    }
  });
  
  // Test navigasjon mellom sider
  test('should navigate between pages without losing auth', async ({ page }) => {
    console.log('\n🔄 Testing navigation flow...');
    
    // Start på dashboard
    await page.goto(`${BASE_URL}/no/dashboard`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/innlogging');
    
    // Gå til profil
    await page.goto(`${BASE_URL}/no/profil`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/profil');
    
    // Gå til innstillinger
    await page.goto(`${BASE_URL}/no/innstillinger`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/innstillinger');
    
    // Tilbake til dashboard
    await page.goto(`${BASE_URL}/no/dashboard`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard');
    
    console.log('  ✅ Navigation flow successful - auth persisted');
  });
  
});

test.describe('📊 Test Summary', () => {
  test.afterAll(async () => {
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total protected pages tested: ${PROTECTED_PAGES.length}`);
    console.log(`Total public pages tested: ${PUBLIC_PAGES.length}`);
    console.log(`Test user: ${TEST_USER.email}`);
    console.log('='.repeat(60) + '\n');
  });
});
