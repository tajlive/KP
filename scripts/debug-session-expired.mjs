#!/usr/bin/env node
/**
 * Debug: Session Expired Problem
 * Sjekker hva som skjer etter vellykket login
 */

import { chromium } from 'playwright';

const BASE_URL = 'https://www.klarpakke.no';

async function debugSessionExpired() {
  console.log('🔐 Debug: Session Expired After Login');
  console.log('=====================================\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();
  
  // Track all redirects
  page.on('response', async response => {
    const url = response.url();
    const status = response.status();
    
    if (url.includes('login') || url.includes('dashboard') || url.includes('callback')) {
      const headers = response.headers();
      console.log(`\n${status} ${url.split('?')[0]}`);
      
      if (headers['location']) {
        console.log(`  → Redirect: ${headers['location']}`);
      }
      if (headers['set-cookie']) {
        console.log(`  🍪 Set-Cookie: ${headers['set-cookie'].substring(0, 100)}...`);
      }
    }
  });
  
  // Console logging
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('auth') || msg.text().includes('session')) {
      console.log(`[${msg.type()}] ${msg.text()}`);
    }
  });
  
  try {
    // 1. Gå til login
    console.log('📍 Step 1: Går til login...');
    await page.goto(`${BASE_URL}/no/login`);
    await page.waitForTimeout(2000);
    
    // Sjekk cookies før
    let cookies = await context.cookies();
    console.log(`\n🍪 Cookies før login: ${cookies.filter(c => c.name.includes('sb-')).length} auth cookies`);
    
    // 2. Klikk Google login
    console.log('\n📍 Step 2: Klikker Google login...');
    const googleBtn = page.locator('button:has-text("Google"), a:has-text("Google")');
    
    if (await googleBtn.isVisible().catch(() => false)) {
      // Vent på OAuth popup
      const [popup] = await Promise.all([
        page.waitForEvent('popup', { timeout: 10000 }).catch(() => null),
        googleBtn.click()
      ]);
      
      if (popup) {
        console.log('   Google popup åpnet');
        await popup.waitForLoadState('networkidle');
        
        // Vent på at bruker logger inn (manuelt)
        console.log('   Venter 30s på at du velger konto...');
        await page.waitForTimeout(30000);
      }
    }
    
    // 3. Sjekk hvor vi endte opp
    const currentUrl = page.url();
    console.log(`\n📍 Step 3: Current URL: ${currentUrl}`);
    
    // Sjekk cookies etter callback
    cookies = await context.cookies();
    const authCookies = cookies.filter(c => c.name.includes('sb-'));
    console.log(`\n🍪 Auth cookies etter callback: ${authCookies.length}`);
    authCookies.forEach(c => {
      console.log(`   - ${c.name}:`);
      console.log(`     domain: ${c.domain}`);
      console.log(`     path: ${c.path}`);
      console.log(`     secure: ${c.secure}`);
      console.log(`     sameSite: ${c.sameSite}`);
      console.log(`     expires: ${c.expires ? new Date(c.expires * 1000).toISOString() : 'session'}`);
    });
    
    // 4. Sjekk om vi er på dashboard eller redirectet til login
    if (currentUrl.includes('/login') && currentUrl.includes('expired=1')) {
      console.log('\n❌ PROBLEM CONFIRMED: Session expired umiddelbart etter login');
      
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
      
      console.log(`\n💾 localStorage: ${Object.keys(localStorage).length} items`);
      Object.entries(localStorage).forEach(([k, v]) => console.log(`   - ${k}: ${v}...`));
      
    } else if (currentUrl.includes('/dashboard')) {
      console.log('\n✅ På dashboard - session OK');
      
      // Test refresh
      console.log('\n📍 Step 4: Refresher...');
      await page.reload();
      await page.waitForTimeout(3000);
      
      const afterRefresh = page.url();
      if (afterRefresh.includes('/login')) {
        console.log('❌ Session mistet etter refresh!');
      } else {
        console.log('✅ Session beholdt etter refresh');
      }
    }
    
    // Hold browser åpen
    console.log('\n⏳ Browser holder åpen i 30s...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugSessionExpired();
