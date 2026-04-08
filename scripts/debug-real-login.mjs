#!/usr/bin/env node
/**
 * Debug: Test med faktisk Google OAuth (manuell intervensjon)
 * Holder browser åpen slik at bruker kan logge inn
 */

import { chromium } from 'playwright';

const BASE_URL = 'https://www.klarpakke.no';
const TEST_EMAIL = 'tomarnejensen@gmail.com';

async function debugRealLogin() {
  console.log('🔐 Debug: Faktisk Login Test');
  console.log('=============================');
  console.log('');
  console.log('⚠️  DENNE TESTEN KREVER MANUELL INTERVENSJON');
  console.log('   1. Browser åpnes');
  console.log('   2. Du må klikke "Logg inn med Google"');
  console.log('   3. Velg konto: ' + TEST_EMAIL);
  console.log('   4. Testen analyserer resultatet');
  console.log('');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  // Viktig: Aktiver third-party cookies
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  
  const page = await context.newPage();
  
  // Track all network activity
  const networkLog = [];
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('callback') || url.includes('auth') || url.includes('supabase')) {
      networkLog.push({
        type: 'request',
        method: request.method(),
        url: url.split('?')[0],
        timestamp: Date.now()
      });
    }
  });
  
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('callback') || url.includes('auth') || url.includes('supabase')) {
      const status = response.status();
      const headers = response.headers();
      networkLog.push({
        type: 'response',
        status,
        url: url.split('?')[0],
        location: headers['location'],
        setCookie: headers['set-cookie']?.substring(0, 100),
        timestamp: Date.now()
      });
      
      // Log til console
      console.log(`\n${status} ${url.split('?')[0]}`);
      if (headers['location']) console.log(`  → ${headers['location']}`);
      if (headers['set-cookie']) console.log(`  🍪 Set-Cookie`);
    }
  });
  
  // Console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`\n❌ Console Error: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`\n❌ Page Error: ${error.message}`);
  });
  
  // 1. Gå til login
  console.log('📍 Går til login...');
  await page.goto(`${BASE_URL}/no/login`);
  await page.waitForLoadState('networkidle');
  
  // Sjekk cookies før
  let cookies = await context.cookies();
  console.log(`\n🍪 Auth cookies før: ${cookies.filter(c => c.name.includes('sb-')).length}`);
  
  // 2. Vent på at bruker logger inn
  console.log('\n⏳ Venter på at du logger inn...');
  console.log('   Klikk på "Logg inn med Google" og velg konto');
  
  // Vent på redirect til dashboard (eller timeout)
  try {
    await page.waitForURL('**/dashboard**', { timeout: 60000 });
    console.log('\n✅ Redirect til dashboard registrert!');
  } catch {
    console.log('\n⚠️  Timeout - sjekker status uansett');
  }
  
  // 3. Analyser resultat
  const currentUrl = page.url();
  console.log(`\n📊 Resultat:`);
  console.log(`   Final URL: ${currentUrl}`);
  
  // Sjekk cookies etter
  cookies = await context.cookies();
  const authCookies = cookies.filter(c => c.name.includes('sb-'));
  console.log(`\n🍪 Auth cookies etter: ${authCookies.length}`);
  authCookies.forEach(c => {
    console.log(`   - ${c.name}:`);
    console.log(`     domain: ${c.domain}`);
    console.log(`     expires: ${new Date(c.expires * 1000).toISOString()}`);
  });
  
  // Sjekk localStorage
  const localStorage = await page.evaluate(() => {
    const items = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('sb-')) {
        items[key] = localStorage.getItem(key)?.substring(0, 50);
      }
    }
    return items;
  });
  
  console.log(`\n💾 localStorage auth items: ${Object.keys(localStorage).length}`);
  Object.entries(localStorage).forEach(([key, value]) => {
    console.log(`   - ${key}: ${value}...`);
  });
  
  // 4. Test refresh
  if (currentUrl.includes('/dashboard')) {
    console.log('\n📍 Tester refresh...');
    await page.reload();
    await page.waitForTimeout(3000);
    
    const urlAfterRefresh = page.url();
    console.log(`   URL etter refresh: ${urlAfterRefresh}`);
    
    if (urlAfterRefresh.includes('/login')) {
      console.log('   ❌ SESSION LOST - Bruker kastet ut!');
    } else {
      console.log('   ✅ Session beholdt');
    }
  }
  
  // Print network log
  console.log('\n📡 Network Log:');
  networkLog.forEach(entry => {
    if (entry.type === 'request') {
      console.log(`   → ${entry.method} ${entry.url}`);
    } else {
      console.log(`   ← ${entry.status} ${entry.url}`);
      if (entry.location) console.log(`      ↪️  ${entry.location}`);
    }
  });
  
  // Hold browser åpen for inspeksjon
  console.log('\n⏳ Browser holder åpen i 30 sekunder...');
  console.log('   Du kan inspisere DevTools nå');
  await page.waitForTimeout(30000);
  
  await browser.close();
}

debugRealLogin().catch(console.error);
