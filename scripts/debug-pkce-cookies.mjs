#!/usr/bin/env node
/**
 * Debug PKCE Cookie Handling
 * Sjekker om code-verifier cookie blir riktig satt og sendt
 */

import { chromium } from 'playwright';

const BASE_URL = 'https://www.klarpakke.no';

async function debugPKCE() {
  console.log('🔐 Debug PKCE Cookie Handling');
  console.log('=============================\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Log ALL cookies throughout the flow
  const logCookies = async (label) => {
    const cookies = await context.cookies();
    const relevant = cookies.filter(c => 
      c.name.includes('sb-') || 
      c.name.includes('verifier') ||
      c.name.includes('pkce')
    );
    console.log(`\n🍪 ${label}:`);
    console.log(`   Total cookies: ${cookies.length}`);
    relevant.forEach(c => {
      console.log(`   - ${c.name}:`);
      console.log(`     domain: ${c.domain}`);
      console.log(`     path: ${c.path}`);
      console.log(`     value: ${c.value.substring(0, 30)}...`);
    });
    if (relevant.length === 0) console.log('   (ingen auth cookies)');
    return relevant;
  };
  
  // Step 1: Gå til login
  console.log('📍 Step 1: Går til login...');
  await page.goto(`${BASE_URL}/no/login`);
  await page.waitForTimeout(2000);
  await logCookies('Etter login page load');
  
  // Step 2: Start OAuth (men ikke fullfør)
  console.log('\n📍 Step 2: Starter OAuth flow...');
  
  // Intercept the OAuth redirect
  const [oauthRequest] = await Promise.all([
    page.waitForRequest(req => req.url().includes('supabase.co/auth/v1/authorize')),
    page.click('button:has-text("Google")').catch(() => console.log('   Klarte ikke klikke Google-knapp'))
  ]);
  
  console.log('   OAuth request sendt');
  
  // Vent litt for å se om code-verifier cookie blir satt
  await page.waitForTimeout(2000);
  const cookiesAfterStart = await logCookies('Etter OAuth start (før Google)');
  
  // Sjekk om code-verifier finnes
  const hasVerifier = cookiesAfterStart.some(c => c.name.includes('verifier'));
  console.log(`\n   ${hasVerifier ? '✅' : '❌'} PKCE verifier cookie ${hasVerifier ? 'funnet' : 'IKKE funnet'}`);
  
  if (hasVerifier) {
    const verifierCookie = cookiesAfterStart.find(c => c.name.includes('verifier'));
    console.log(`   Cookie name: ${verifierCookie.name}`);
    console.log(`   Cookie domain: ${verifierCookie.domain}`);
    console.log(`   Cookie path: ${verifierCookie.path}`);
    
    // Viktig: Sjekk om domain matcher
    console.log(`\n   🔍 Cookie Domain Analysis:`);
    console.log(`      Cookie domain: "${verifierCookie.domain}"`);
    console.log(`      Expected domain for www.klarpakke.no: ".klarpakke.no"`);
    console.log(`      Match: ${verifierCookie.domain === '.klarpakke.no' ? '✅' : '❌'}`);
  }
  
  // Step 3: Sjekk hva som skjer hvis vi manuelt går til callback
  console.log('\n📍 Step 3: Simulerer callback (med test code)...');
  
  // Gå tilbake til klarpakke for å sjekke cookies
  await page.goto(`${BASE_URL}/no/auth/callback?code=test123`);
  await page.waitForTimeout(2000);
  
  const cookiesDuringCallback = await logCookies('Under callback (før exchange)');
  
  // Sjekk om cookies sendes med til callback
  console.log('\n📍 Step 4: Sjekker om cookies sendes til callback...');
  
  // Clear og test på nytt med eksplisitt logging
  await page.goto(`${BASE_URL}/no/login`);
  await page.waitForTimeout(1000);
  
  // Sett opp request interception
  page.on('request', async request => {
    if (request.url().includes('/auth/callback')) {
      const headers = await request.allHeaders();
      console.log(`\n   📤 Request til callback:`);
      console.log(`      URL: ${request.url()}`);
      console.log(`      Cookie header: ${headers['cookie']?.substring(0, 100) || 'NONE'}...`);
    }
  });
  
  // Gå til callback
  await page.goto(`${BASE_URL}/no/auth/callback?code=test123`);
  await page.waitForTimeout(2000);
  
  await browser.close();
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                     🔍 PKCE ANALYSIS                       ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ PKCE cookie satt:     ${hasVerifier ? '✅ JA' : '❌ NEI'}                           ║`);
  console.log(`║ Cookie domain:        ${(hasVerifier ? cookiesAfterStart.find(c => c.name.includes('verifier'))?.domain : 'N/A').padEnd(20)}              ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  if (!hasVerifier) {
    console.log('\n💡 Mulige årsaker:');
    console.log('   1. Supabase auth ikke initialisert på klienten');
    console.log('   2. Cookie domain mismatch mellom client og server');
    console.log('   3. LocalStorage vs Cookies for PKCE storage');
  }
}

debugPKCE().catch(console.error);
