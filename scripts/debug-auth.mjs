#!/usr/bin/env node
/**
 * Auth Debug Script
 * Checks cookie configuration across the app
 */

import { readFileSync } from 'fs';
import { glob } from 'glob';

console.log('🔍 Debugging Auth/Cookie Issues\n');

// Check 1: Cookie domain in server.ts
console.log('1️⃣ Checking server.ts cookie domain...');
const serverTs = readFileSync('src/lib/supabase/server.ts', 'utf-8');
if (serverTs.includes('getCookieDomain')) {
  console.log('   ✅ Cookie domain helper present');
} else {
  console.log('   ❌ Cookie domain helper MISSING');
}

if (serverTs.includes('domain: cookieDomain')) {
  console.log('   ✅ Cookie domain being set');
} else {
  console.log('   ❌ Cookie domain NOT being set');
}

// Check 2: /settings in protected paths
console.log('\n2️⃣ Checking /settings in PROTECTED_PATHS...');
const authTs = readFileSync('src/middleware/auth.ts', 'utf-8');
if (authTs.includes('"/settings"')) {
  console.log('   ✅ /settings is protected');
} else {
  console.log('   ❌ /settings NOT protected');
}

// Check 3: Fetch calls with credentials
console.log('\n3️⃣ Checking API fetch calls...');
const files = await glob('src/**/*.{ts,tsx}');
let fetchWithoutCredentials = 0;

for (const file of files.slice(0, 50)) { // Check first 50 files
  const content = readFileSync(file, 'utf-8');
  // Look for fetch calls without credentials
  if (content.includes('fetch(') && !content.includes('credentials:')) {
    // This might be OK if it's not an API call
    continue;
  }
}

console.log('   ℹ️  Fetch credential checking requires runtime inspection');

console.log('\n📋 DIAGNOSIS:');
console.log('   The 401 errors suggest cookies are not being sent with API requests.');
console.log('   Possible causes:');
console.log('   1. Old cookies before fix - try clearing cookies');
console.log('   2. Cookie domain mismatch between middleware and API');
console.log('   3. CORS issues with credentials');
console.log('   4. Session expired and not refreshing');

console.log('\n🔧 NEXT STEPS:');
console.log('   1. Clear all cookies for klarpakke.no in browser');
console.log('   2. Hard refresh (Cmd+Shift+R)');
console.log('   3. Log in again');
console.log('   4. Check Network tab - cookies should be sent with API calls');
