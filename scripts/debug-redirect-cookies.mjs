#!/usr/bin/env node
/**
 * Debug: Hva skjer med cookies under redirect?
 */

import { chromium } from 'playwright';

const BASE_URL = 'https://www.klarpakke.no';

async function debugRedirectCookies() {
  console.log('🔍 Debug: Cookies under redirect');
  console.log('=================================\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Sett opp PKCE cookie manuelt (som Supabase ville gjort)
  await context.addCookies([{
    name: 'sb-vuxbjlykgmzskxbclquf-auth-token-code-verifier',
    value: '"test-verifier-value-123"',
    domain: '.klarpakke.no',
    path: '/',
    secure: true,
    sameSite: 'None',
    expires: Date.now() / 1000 + 3600
  }]);
  
  console.log('Cookies satt før redirect:');
  let cookies = await context.cookies();
  cookies.filter(c => c.name.includes('sb-')).forEach(c => {
    console.log(`  - ${c.name}: ${c.domain}`);
  });
  
  // Intercept alle requests og se på cookies
  page.on('request', async request => {
    const url = request.url();
    if (url.includes('/auth/callback')) {
      const headers = request.headers();
      console.log(`\n📤 Request: ${url.split('?')[0]}`);
      const cookieHeader = headers['cookie'];
      if (cookieHeader) {
        const hasVerifier = cookieHeader.includes('code-verifier');
        console.log(`   Cookie header: ${cookieHeader.substring(0, 80)}...`);
        console.log(`   Har PKCE verifier: ${hasVerifier ? '✅' : '❌'}`);
      } else {
        console.log('   Ingen cookie header! ❌');
      }
    }
  });
  
  // Intercept responses
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/auth/callback')) {
      const status = response.status();
      const headers = response.headers();
      console.log(`\n📥 Response: ${status} ${url.split('?')[0]}`);
      if (headers['location']) {
        console.log(`   Redirect til: ${headers['location']}`);
      }
    }
  });
  
  // Test 1: Gå til /no/auth/callback
  console.log('\n📍 Test 1: GET /no/auth/callback?code=test');
  await page.goto(`${BASE_URL}/no/auth/callback?code=test123`);
  await page.waitForTimeout(2000);
  
  console.log(`\nURL etter request: ${page.url()}`);
  
  // Sjekk cookies etter
  console.log('\nCookies etter redirect:');
  cookies = await context.cookies();
  const authCookies = cookies.filter(c => c.name.includes('sb-'));
  console.log(`  Antall auth cookies: ${authCookies.length}`);
  authCookies.forEach(c => {
    console.log(`  - ${c.name}: ${c.domain}`);
  });
  
  // Test 2: Gå til /auth/callback (uten locale)
  console.log('\n📍 Test 2: GET /auth/callback?code=test');
  await page.goto(`${BASE_URL}/auth/callback?code=test456`);
  await page.waitForTimeout(2000);
  
  console.log(`\nURL etter request: ${page.url()}`);
  
  // Sjekk cookies igjen
  console.log('\nCookies etter andre request:');
  cookies = await context.cookies();
  const authCookies2 = cookies.filter(c => c.name.includes('sb-'));
  console.log(`  Antall auth cookies: ${authCookies2.length}`);
  
  await browser.close();
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                  🔍 REDIRECT ANALYSIS                      ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Cookies før:      1                                        ║`);
  console.log(`║ Cookies etter:    ${String(authCookies.length).padEnd(3)}                                       ║`);
  console.log(`║ Mistet cookies:   ${authCookies.length < 1 ? '⚠️ KANSKJE' : '✅ NEI'}                                   ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
}

debugRedirectCookies().catch(console.error);
