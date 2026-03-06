#!/usr/bin/env node
/**
 * Diagnose test user issues
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TEST_EMAIL = 'tom@klarpakke.no';
const TEST_PASSWORD = 'TestPassword123!';

console.log('🔍 Diagnosing test user setup...\n');

// Test 1: Check if we can connect with anon key
console.log('1️⃣ Testing anon key connection...');
const anonClient = createClient(SUPABASE_URL, ANON_KEY);
const { data: { session }, error: sessionError } = await anonClient.auth.getSession();
console.log('   Session check:', sessionError ? '❌ ' + sessionError.message : '✅ OK');

// Test 2: Try to sign in with test credentials
console.log('\n2️⃣ Testing sign-in with test credentials...');
const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
});

if (signInError) {
  console.log('   ❌ Sign-in failed:', signInError.message);
  console.log('   Error code:', signInError.status);
  
  if (signInError.message.includes('Invalid login credentials')) {
    console.log('\n   💡 Test user does not exist or password is wrong');
    console.log('   You need to create the test user manually:');
    console.log('   1. Go to https://app.supabase.com/project/_/auth/users');
    console.log('   2. Click "Add user"');
    console.log('   3. Email: test@klarpakke.com');
    console.log('   4. Password: TestPassword123!');
    console.log('   5. Check "Auto-confirm email"');
    console.log('   6. Click "Create user"');
  }
} else {
  console.log('   ✅ Sign-in successful!');
  console.log('   User ID:', signInData.user?.id);
  console.log('   Email confirmed:', !!signInData.user?.email_confirmed_at);
}

// Test 3: Check if service role works
if (SERVICE_ROLE_KEY) {
  console.log('\n3️⃣ Testing service role key...');
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  
  const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
  
  if (listError) {
    console.log('   ❌ Failed to list users:', listError.message);
  } else {
    console.log('   ✅ Service role working');
    console.log('   Total users:', users.length);
    
    const testUser = users.find(u => u.email === TEST_EMAIL);
    if (testUser) {
      console.log('   ✅ Test user found in database');
      console.log('   User ID:', testUser.id);
      console.log('   Created:', testUser.created_at);
      console.log('   Email confirmed:', !!testUser.email_confirmed_at);
    } else {
      console.log('   ❌ Test user NOT found in database');
    }
  }
} else {
  console.log('\n3️⃣ Service role key not available (skipping admin checks)');
}

console.log('\n' + '='.repeat(50));
console.log('DIAGNOSIS COMPLETE');
console.log('='.repeat(50));
