#!/usr/bin/env node
/**
 * Chrome DevTools Debug Script
 * Bruker Playwright for å inspisere Network, Cookies og Console
 */

import { chromium } from 'playwright';

const BASE_URL = 'https://www.klarpakke.no';
const TEST_EMAIL = 'tomarnejensen@gmail.com';

async function runChromeDebug() {
  console.log('🔧 Chrome DevTools Debugger');
  console.log('============================\n');
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--auto-open-devtools-for-tabs'] // Åpner DevTools automatisk
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    recordVideo: { dir: 'debug-videos/' }
  });
  
  const page = await context.newPage();
  
  // Console logging
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (text.includes('auth') || text.includes('session') || text.includes('cookie') || 
        text.includes('error') || type === 'error') {
      console.log(`[${type.toUpperCase()}] ${text}`);
    }
  });
  
  // Page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });
  
  // Request/Response logging
  page.on('request', request => {
    const url = request.url();
    if (url.includes('auth') || url.includes('session') || url.includes('callback')) {
      console.log(`→ Request: ${request.method()} ${url}`);
    }
  });
  
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('auth') || url.includes('session') || url.includes('callback')) {
      console.log(`← Response: ${response.status()} ${url}`);
      
      // Log cookies from response
      const headers = await response.allHeaders();
      if (headers['set-cookie']) {
        console.log(`   🍪 Set-Cookie: ${headers['set-cookie']}`);
      }
    }
  });
  
  try {
    // Step 1: Gå til login
    console.log('\n📍 Step 1: Går til /no/login');
    await page.goto(`${BASE_URL}/no/login`);
    await page.waitForLoadState('networkidle');
    
    // Sjekk cookies før login
    const cookiesBefore = await context.cookies();
    const authCookiesBefore = cookiesBefore.filter(c => c.name.includes('sb-'));
    console.log(`\n🍪 Auth cookies før login: ${authCookiesBefore.length}`);
    authCookiesBefore.forEach(c => {
      console.log(`   - ${c.name}: domain=${c.domain}`);
    });
    
    // Step 2: Ta screenshot av login-siden
    await page.screenshot({ path: 'debug-01-login.png' });
    console.log('\n📸 Screenshot: debug-01-login.png');
    
    // Step 3: Klikk "Logg inn med Google"
    console.log('\n📍 Step 2: Klikker "Logg inn med Google"...');
    console.log('   ⚠️  Venter på Google popup (manuell interaksjon kan være nødvendig)');
    
    const googleButton = page.locator('button:has-text("Google"), button:has-text("google")');
    
    if (await googleButton.isVisible().catch(() => false)) {
      await googleButton.click();
      console.log('   ✓ Klikket på Google-knapp');
      
      // Vent på popup eller redirect
      await page.waitForTimeout(5000);
      
      // Sjekk om vi er på Google
      const currentUrl = page.url();
      console.log(`\n   Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('accounts.google.com')) {
        console.log('   → På Google login-siden');
        console.log('   ⚠️  MANUELL STEG: Velg konto eller logg inn');
        console.log('   Venter 30 sekunder...');
        
        // Vent på at bruker velger konto eller redirect tilbake
        await page.waitForTimeout(30000);
      }
    } else {
      console.log('   ⚠️  Google-knapp ikke funnet');
    }
    
    // Step 4: Sjekk etter callback/redirect
    console.log('\n📍 Step 3: Sjekker etter auth callback...');
    
    const finalUrl = page.url();
    console.log(`   Final URL: ${finalUrl}`);
    
    // Sjekk cookies etter login
    const cookiesAfter = await context.cookies();
    const authCookiesAfter = cookiesAfter.filter(c => 
      c.name.includes('sb-') || c.name.includes('supabase')
    );
    
    console.log(`\n🍪 Auth cookies etter login: ${authCookiesAfter.length}`);
    authCookiesAfter.forEach(c => {
      console.log(`   - ${c.name}:`);
      console.log(`     domain: ${c.domain}`);
      console.log(`     path: ${c.path}`);
      console.log(`     secure: ${c.secure}`);
      console.log(`     httpOnly: ${c.httpOnly}`);
      console.log(`     sameSite: ${c.sameSite}`);
      console.log(`     expires: ${c.expires ? new Date(c.expires * 1000).toISOString() : 'session'}`);
    });
    
    // Step 5: Sjekk localStorage
    const localStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('sb-') || key.includes('supabase'))) {
          items[key] = localStorage.getItem(key)?.substring(0, 50) + '...';
        }
      }
      return items;
    });
    
    console.log(`\n💾 localStorage auth items: ${Object.keys(localStorage).length}`);
    Object.entries(localStorage).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value}`);
    });
    
    // Step 6: Refresh og sjekk om session beholdes
    if (finalUrl.includes('/dashboard')) {
      console.log('\n📍 Step 4: Refresher for å teste session persistence...');
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const urlAfterRefresh = page.url();
      console.log(`   URL etter refresh: ${urlAfterRefresh}`);
      
      if (urlAfterRefresh.includes('/login')) {
        console.log('   ❌ SESSION LOST - Bruker kastet til login!');
      } else if (urlAfterRefresh.includes('/dashboard')) {
        console.log('   ✅ SESSION OK - Bruker forblir på dashboard');
      }
      
      await page.screenshot({ path: 'debug-02-after-refresh.png' });
    }
    
    // Step 7: Ta final screenshot
    await page.screenshot({ path: 'debug-03-final.png', fullPage: true });
    
    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                     📊 DEBUG SUMMARY                       ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ URL etter login:     ${finalUrl.padEnd(40)} ║`);
    console.log(`║ Auth cookies funnet: ${String(authCookiesAfter.length).padEnd(40)} ║`);
    console.log(`║ localStorage items:  ${String(Object.keys(localStorage).length).padEnd(40)} ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    console.log('\n📁 Filer lagret:');
    console.log('   - debug-01-login.png');
    console.log('   - debug-02-after-refresh.png');
    console.log('   - debug-03-final.png');
    console.log('   - debug-videos/');
    
    console.log('\n⏳ Browser holder åpen i 60 sekunder...');
    console.log('   Du kan inspisere DevTools manuelt nå.');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'debug-error.png', fullPage: true });
    console.log('📸 Error screenshot: debug-error.png');
  } finally {
    await browser.close();
  }
}

runChromeDebug();
