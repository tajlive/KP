import { test, expect } from '@playwright/test';

/**
 * 🧪 RASK SIDE-TEST
 * 
 * Tester alle sider raskt og gir en oppsummering
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Sider som skal testes
const PAGES_TO_TEST = [
  // Dashboard & Hovedsider
  { path: '/no/dashboard', name: 'Dashboard' },
  { path: '/no/onboarding', name: 'Onboarding' },
  
  // Trading
  { path: '/no/paper-trading', name: 'Paper Trading' },
  { path: '/no/auto-trading', name: 'Auto Trading' },
  { path: '/no/auto-trading-ai', name: 'AI Trading' },
  { path: '/no/live-trading', name: 'Live Trading' },
  { path: '/no/copy-trading', name: 'Copy Trading' },
  
  // Analyse
  { path: '/no/handelshistorikk', name: 'Handelshistorikk' },
  { path: '/no/leaderboard', name: 'Leaderboard' },
  { path: '/no/varsler', name: 'Varsler' },
  
  // Læring
  { path: '/no/akademi', name: 'Akademi' },
  { path: '/no/kurs', name: 'Kurs' },
  { path: '/no/quiz', name: 'Quiz' },
  { path: '/no/simulator', name: 'Simulator' },
  
  // Konkurranser
  { path: '/no/leagues', name: 'Leagues' },
  { path: '/no/beta', name: 'Beta' },
  
  // Profil
  { path: '/no/profil', name: 'Profil' },
  { path: '/no/innstillinger', name: 'Innstillinger' },
  { path: '/no/konto', name: 'Konto' },
  
  // Marked
  { path: '/no/marketplace', name: 'Marketplace' },
  
  // Offentlige
  { path: '/', name: 'Home' },
  { path: '/priser', name: 'Priser' },
];

test.describe('🌐 Pages Smoke Test', () => {
  
  const results: { name: string; path: string; status: number; ok: boolean }[] = [];
  
  for (const page of PAGES_TO_TEST) {
    test(`check ${page.name}`, async ({ page: p }) => {
      const response = await p.goto(`${BASE_URL}${page.path}`, { 
        timeout: 15000,
        waitUntil: 'domcontentloaded' 
      });
      
      const status = response?.status() || 0;
      const isOk = status === 200;
      
      results.push({
        name: page.name,
        path: page.path,
        status,
        ok: isOk
      });
      
      // Sjekk at det ikke er 404-side
      const content = await p.content();
      const is404 = content.toLowerCase().includes('404') || 
                    content.toLowerCase().includes('not found') ||
                    content.toLowerCase().includes('ikke funnet');
      
      if (!isOk || is404) {
        console.log(`❌ ${page.name}: ${status} (404: ${is404})`);
      } else {
        console.log(`✅ ${page.name}: ${status}`);
      }
      
      expect(is404).toBe(false);
    });
  }
  
  test.afterAll(async () => {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTATOVERSIKT');
    console.log('='.repeat(60));
    
    const ok = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok);
    
    console.log(`\n✅ OK: ${ok.length}/${results.length}`);
    console.log(`❌ Feil: ${failed.length}/${results.length}\n`);
    
    if (failed.length > 0) {
      console.log('Sider med feil:');
      failed.forEach(f => {
        console.log(`  ❌ ${f.name} (${f.path}) - Status: ${f.status}`);
      });
    }
    
    console.log('='.repeat(60));
  });
});
