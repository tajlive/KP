#!/usr/bin/env node
/**
 * Test callback-ruten direkte med fake code
 * For å se hvordan den håndterer cookies
 */

import { chromium } from 'playwright';

const BASE_URL = 'https://www.klarpakke.no';

async function testCallback() {
  console.log('🔍 Testing Auth Callback Route');
  console.log('==============================\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Intercept all responses
  const responses = [];
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('callback') || url.includes('auth')) {
      const status = response.status();
      const headers = await response.allHeaders();
      responses.push({ url: url.split('?')[0], status, headers });
      
      console.log(`📡 ${response.request().method()} ${status} ${url.split('?')[0]}`);
      
      if (headers['set-cookie']) {
        console.log('   🍪 Set-Cookie:', headers['set-cookie'].substring(0, 100));
      }
      if (headers['location']) {
        console.log('   ↪️  Location:', headers['location']);
      }
    }
  });
  
  // Test 1: Callback uten code (skal redirect til error)
  console.log('\n📍 Test 1: Callback uten code...');
  await page.goto(`${BASE_URL}/no/auth/callback`);
  await page.waitForTimeout(2000);
  
  console.log(`   Current URL: ${page.url()}`);
  
  // Test 2: Callback med fake code (skal feile, men vise cookie-handling)
  console.log('\n📍 Test 2: Callback med invalid code...');
  await page.goto(`${BASE_URL}/no/auth/callback?code=invalid_test_code_123`);
  await page.waitForTimeout(2000);
  
  console.log(`   Current URL: ${page.url()}`);
  
  // Sjekk cookies
  const cookies = await context.cookies();
  console.log(`\n🍪 Cookies etter callback-tests: ${cookies.length}`);
  cookies.forEach(c => {
    if (c.name.includes('sb-')) {
      console.log(`   - ${c.name}:`);
      console.log(`     domain: ${c.domain}`);
      console.log(`     sameSite: ${c.sameSite}`);
    }
  });
  
  // Test 3: Sjekk login-sidens JavaScript
  console.log('\n📍 Test 3: Analyserer login-siden...');
  await page.goto(`${BASE_URL}/no/login`);
  await page.waitForLoadState('networkidle');
  
  // Sjekk om det er errors i console
  const logs = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      logs.push(msg.text());
    }
  });
  
  await page.waitForTimeout(2000);
  
  if (logs.length > 0) {
    console.log('   JavaScript errors funnet:');
    logs.slice(0, 5).forEach(log => console.log(`   ❌ ${log.substring(0, 100)}`));
  } else {
    console.log('   ✅ Ingen JavaScript errors');
  }
  
  // Sjekk localStorage etter login page load
  const localStorage = await page.evaluate(() => {
    const items = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      items[key] = localStorage.getItem(key)?.substring(0, 50);
    }
    return items;
  });
  
  console.log(`\n💾 localStorage items: ${Object.keys(localStorage).length}`);
  Object.entries(localStorage).forEach(([key, value]) => {
    console.log(`   - ${key}: ${value}...`);
  });
  
  // Test 4: Sjekk om Supabase klienten er initialisert
  console.log('\n📍 Test 4: Sjekker Supabase client initialization...');
  const hasSupabase = await page.evaluate(() => {
    return typeof window !== 'undefined' && 
           (window.__supabase || document.querySelector('script[src*="supabase"]'));
  });
  console.log(`   Supabase detected: ${hasSupabase ? '✅' : '❌'}`);
  
  await browser.close();
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                     📊 ANALYSIS SUMMARY                    ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Callback tests:        ${responses.length} requests                   ║`);
  console.log(`║ Auth cookies satt:     ${cookies.filter(c => c.name.includes('sb-')).length > 0 ? '❌ NEI' : '❌ NEI'}                      ║`);
  console.log(`║ localStorage items:    ${String(Object.keys(localStorage).length).padEnd(3)}                       ║`);
  console.log(`║ JS Errors:             ${String(logs.length).padEnd(3)}                       ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  console.log('\n💡 Hypoteser basert på test:');
  console.log('   1. Callback ruten returnerer ingen session cookies');
  console.log('   2. Enten: Code exchange feiler, eller');
  console.log('   3. Cookies blir ikke satt pga domain/secure/samesite issues');
  console.log('   4. Eller: Middleware på callback ruten?');
}

testCallback().catch(console.error);
