#!/usr/bin/env node
/**
 * Auth Flow Debugger
 * Bruker Playwright for å teste komplett innloggingsflyt
 */

import { chromium } from 'playwright';

const BASE_URL = 'https://www.klarpakke.no';
const TEST_USER = 'tomarnejensen@gmail.com';

async function debugAuth() {
  console.log('🔐 Starter auth debugging...\n');
  
  const browser = await chromium.launch({ 
    headless: false, // Vis browser for debugging
    slowMo: 100 
  });
  
  const context = await browser.newContext({
    recordVideo: { dir: 'test-videos/' },
  });
  
  // Enable logging
  context.on('request', req => {
    if (req.url().includes('auth') || req.url().includes('session')) {
      console.log(`📤 Request: ${req.method()} ${req.url()}`);
    }
  });
  
  context.on('response', async res => {
    if (res.url().includes('auth') || res.url().includes('session')) {
      console.log(`📥 Response: ${res.status()} ${res.url()}`);
      const headers = await res.allHeaders();
      if (headers['set-cookie']) {
        console.log(`🍪 Set-Cookie: ${headers['set-cookie']}`);
      }
    }
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Gå til login
    console.log('Step 1: Går til login...');
    await page.goto(`${BASE_URL}/no/login`);
    await page.waitForLoadState('networkidle');
    
    // Sjekk cookies før login
    const cookiesBefore = await context.cookies();
    console.log(`Cookies før login: ${cookiesBefore.length}`);
    
    // Step 2: Klikk "Logg inn med Google"
    console.log('\nStep 2: Klikker "Logg inn med Google"...');
    const googleButton = await page.locator('button:has-text("Google")');
    
    if (await googleButton.isVisible().catch(() => false)) {
      await googleButton.click();
      
      // Vent på Google popup
      const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        page.waitForTimeout(1000),
      ]);
      
      console.log('Google popup åpnet');
      
      // Sjekk om bruker allerede er logget inn hos Google
      await popup.waitForLoadState('networkidle');
      
      if (await popup.locator('text=' + TEST_USER).isVisible().catch(() => false)) {
        console.log('Bruker funnet i Google, velger...');
        await popup.locator('text=' + TEST_USER).click();
      } else {
        console.log('⚠️ Bruker ikke funnet i Google accountchooser');
      }
      
      // Vent på redirect tilbake
      await page.waitForURL('**/dashboard**', { timeout: 30000 });
      
      // Step 3: Sjekk om vi er logget inn
      console.log('\nStep 3: Sjekker om innlogging var vellykket...');
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);
      
      // Sjekk cookies etter login
      const cookiesAfter = await context.cookies();
      console.log(`\nCookies etter login: ${cookiesAfter.length}`);
      
      const authCookies = cookiesAfter.filter(c => 
        c.name.includes('sb-') || 
        c.name.includes('supabase') ||
        c.name.includes('auth')
      );
      
      console.log(`Auth cookies funnet: ${authCookies.length}`);
      authCookies.forEach(c => {
        console.log(`  - ${c.name}: ${c.value.substring(0, 20)}... (domain: ${c.domain})`);
      });
      
      // Sjekk localStorage
      const localStorage = await page.evaluate(() => 
        Object.fromEntries(Object.entries(localStorage).filter(([k]) => 
          k.includes('sb-') || k.includes('supabase')
        ))
      );
      
      console.log(`\nLocalStorage items: ${Object.keys(localStorage).length}`);
      
      // Step 4: Refresh og sjekk om session beholdes
      console.log('\nStep 4: Refresher siden for å sjekke session...');
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const urlAfterRefresh = page.url();
      console.log(`URL etter refresh: ${urlAfterRefresh}`);
      
      if (urlAfterRefresh.includes('/login')) {
        console.log('❌ FEIL: Bruker ble kastet ut etter refresh!');
      } else if (urlAfterRefresh.includes('/dashboard')) {
        console.log('✅ Session beholdes korrekt!');
      }
      
    } else {
      console.log('⚠️ Google login knapp ikke funnet');
    }
    
  } catch (error) {
    console.error('❌ Error under debugging:', error);
    
    // Ta screenshot
    await page.screenshot({ path: 'auth-error.png', fullPage: true });
    console.log('Screenshot lagret: auth-error.png');
    
  } finally {
    console.log('\n🔍 Debug info:');
    console.log('  - Sjekk test-videos/ for opptak');
    console.log('  - Sjekk auth-error.png for screenshot');
    
    // Hold browser åpen for manuell inspeksjon
    console.log('\n⏳ Browser holder åpen i 30 sekunder...');
    await page.waitForTimeout(30000);
    
    await browser.close();
  }
}

debugAuth();
