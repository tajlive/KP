#!/usr/bin/env node
/**
 * Debug: Hydration error etter login
 */

import { chromium } from 'playwright';

const BASE_URL = 'https://www.klarpakke.no';

async function debugHydration() {
  console.log('🔍 Debug: Hydration Error');
  console.log('=========================\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('418') || text.includes('hydrat') || text.includes('auth') || msg.type() === 'error') {
      console.log(`[${msg.type().toUpperCase()}] ${text.substring(0, 200)}`);
    }
  });
  
  // 1. Gå til login
  console.log('📍 Går til login...');
  await page.goto(`${BASE_URL}/no/login`);
  await page.waitForTimeout(2000);
  
  // 2. Sjekk cookies før
  let cookies = await context.cookies();
  console.log(`\n🍪 Cookies før: ${cookies.filter(c => c.name.includes('sb-')).length} auth`);
  
  // 3. Klikk Google og vent
  console.log('\n📍 Klikker Google...');
  const googleBtn = page.locator('button:has-text("Google")');
  
  if (await googleBtn.isVisible().catch(() => false)) {
    await Promise.all([
      page.waitForEvent('popup', { timeout: 10000 }).catch(() => null),
      googleBtn.click()
    ]);
    
    console.log('   Venter på login (30s)...');
    await page.waitForTimeout(30000);
  }
  
  // 4. Sjekk hvor vi er
  const currentUrl = page.url();
  console.log(`\n📍 Current URL: ${currentUrl}`);
  
  // 5. Sjekk cookies etter
  cookies = await context.cookies();
  const authCookies = cookies.filter(c => c.name.includes('sb-'));
  console.log(`\n🍪 Auth cookies etter: ${authCookies.length}`);
  authCookies.forEach(c => {
    console.log(`   - ${c.name}`);
    // Sjekk om det er JSON format
    try {
      const value = decodeURIComponent(c.value);
      JSON.parse(value);
      console.log('     ✅ JSON format OK');
    } catch {
      console.log('     ⚠️  IKKE JSON');
    }
  });
  
  // 6. Hvis på dashboard, sjekk localStorage
  if (currentUrl.includes('/dashboard') || currentUrl.includes('/paper')) {
    console.log('\n📍 På dashboard - sjekker localStorage...');
    const localStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) items[key] = localStorage.getItem(key)?.substring(0, 50);
      }
      return items;
    });
    console.log('localStorage:', Object.keys(localStorage));
  }
  
  // Hold åpen
  console.log('\n⏳ Holder åpen i 30s...');
  await page.waitForTimeout(30000);
  await browser.close();
}

debugHydration();
