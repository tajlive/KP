#!/usr/bin/env node
/**
 * Debug Auth med Eksisterende Testbruker
 * Bruker Supabase service key for å sjekke session direkte
 */

import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = 'https://www.klarpakke.no';
const TEST_EMAIL = 'tom@klarpakke.no'; // E2E test user

async function debugExistingUser() {
  console.log('🔐 Debug Auth - Eksisterende Testbruker');
  console.log('========================================\n');
  
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Mangler SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY i .env.local');
    process.exit(1);
  }
  
  // Create admin client
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  // 1. Sjekk bruker i databasen
  console.log('📊 Step 1: Sjekker bruker i Supabase...');
  const { data: users, error: userError } = await supabase
    .from('auth.users')
    .select('id, email, last_sign_in_at, confirmed_at, raw_app_meta_data')
    .eq('email', TEST_EMAIL)
    .single();
  
  if (userError) {
    console.log('   Prøver å hente fra auth schema direkte...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('   ❌ Kunne ikke hente brukere:', authError.message);
    } else {
      const testUser = authUsers.users.find(u => u.email === TEST_EMAIL);
      if (testUser) {
        console.log('   ✅ Testbruker funnet:');
        console.log(`      ID: ${testUser.id}`);
        console.log(`      Email: ${testUser.email}`);
        console.log(`      Sist innlogget: ${testUser.last_sign_in_at || 'Aldri'}`);
        console.log(`      Provider: ${testUser.app_metadata?.provider || 'N/A'}`);
      } else {
        console.log('   ⚠️  Testbruker ikke funnet i auth.users');
        console.log('      Tilgjengelige brukere:');
        authUsers.users.slice(0, 5).forEach(u => console.log(`        - ${u.email}`));
      }
    }
  } else {
    console.log('   ✅ Bruker funnet:', users);
  }
  
  // 2. Sjekk aktive sessions
  console.log('\n📊 Step 2: Sjekker aktive sessions...');
  const { data: sessions, error: sessionError } = await supabase
    .from('auth.sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (sessionError) {
    console.log('   ⚠️  Kunne ikke hente sessions:', sessionError.message);
  } else {
    console.log(`   Fant ${sessions.length} sessions:`);
    sessions.forEach(s => {
      console.log(`   - User: ${s.user_id?.substring(0, 8)}... | Created: ${s.created_at}`);
    });
  }
  
  // 3. Generer session for testbruker
  console.log('\n📊 Step 3: Genererer test session...');
  const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: TEST_EMAIL,
    options: { redirectTo: `${BASE_URL}/no/dashboard` }
  });
  
  if (signInError) {
    console.log('   ⚠️  Magic link feilet:', signInError.message);
    console.log('   Prøver å signe inn med password...');
  } else {
    console.log('   ✅ Magic link generert');
  }
  
  // 4. Browser test med session
  console.log('\n🌐 Step 4: Starter browser test...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Console logging
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('auth') || msg.text().includes('session')) {
      console.log(`   [${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });
  
  // Gå til login
  console.log('   Går til /no/login...');
  await page.goto(`${BASE_URL}/no/login`);
  await page.waitForLoadState('networkidle');
  
  // Sjekk cookies før
  const cookiesBefore = await context.cookies();
  console.log(`   Cookies før: ${cookiesBefore.filter(c => c.name.includes('sb-')).length} auth cookies`);
  
  // Sjekk localStorage før
  const storageBefore = await page.evaluate(() => {
    return Object.keys(localStorage).filter(k => k.includes('sb-'));
  });
  console.log(`   localStorage før: ${storageBefore.length} items`);
  
  // Ta screenshot
  await page.screenshot({ path: 'debug-login-page.png' });
  console.log('   📸 Screenshot: debug-login-page.png');
  
  // 5. Sjekk Google OAuth flow (ikke logg inn, bare observer)
  console.log('\n📊 Step 5: Observasjon av OAuth flow...');
  console.log('   Klikker på Google-knapp...');
  
  const googleBtn = page.locator('button:has-text("Google")');
  if (await googleBtn.isVisible().catch(() => false)) {
    // Intercept network requests
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('authorize')),
      googleBtn.click()
    ]);
    
    console.log('   OAuth URL:', request.url().substring(0, 100) + '...');
    
    // Parse URL params
    const url = new URL(request.url());
    console.log('   Redirect URI:', url.searchParams.get('redirect_to'));
    console.log('   Provider:', url.searchParams.get('provider'));
  }
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                     📊 DEBUG SUMMARY                       ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Testbruker: ${TEST_EMAIL.padEnd(47)} ║`);
  console.log(`║ URL: ${page.url().substring(0, 50).padEnd(54)} ║`);
  console.log(`║ Auth cookies: ${String(cookiesBefore.filter(c => c.name.includes('sb-')).length).padEnd(45)} ║`);
  console.log(`║ localStorage: ${String(storageBefore.length).padEnd(45)} ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Hold browser åpen
  console.log('\n⏳ Browser holder åpen i 30 sekunder...');
  await page.waitForTimeout(30000);
  await browser.close();
}

debugExistingUser().catch(console.error);
