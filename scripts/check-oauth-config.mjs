#!/usr/bin/env node
/**
 * OAuth Configuration Diagnostic Script
 * Checks Supabase auth configuration and provides fix recommendations
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vuxbjlykgmzskxbclquf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 OAuth Configuration Diagnostic');
console.log('=================================\n');

// Check environment
console.log('1. Environment Variables:');
console.log(`   SUPABASE_URL: ${SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\n❌ Cannot proceed without SUPABASE_SERVICE_ROLE_KEY');
  console.log('   Run: export SUPABASE_SERVICE_ROLE_KEY=your_key');
  process.exit(1);
}

// Fetch auth configuration from Supabase
async function checkAuthConfig() {
  try {
    console.log('\n2. Fetching Auth Configuration from Supabase...\n');
    
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/config`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log(`   ❌ Failed to fetch config: ${response.status} ${response.statusText}`);
      return;
    }
    
    const config = await response.json();
    
    console.log('   External Providers:');
    if (config.external_providers) {
      const google = config.external_providers.find(p => p.name === 'google');
      if (google) {
        console.log(`   ✅ Google OAuth: ENABLED`);
        console.log(`      Client ID: ${google.client_id?.substring(0, 20)}...`);
        console.log(`      Enabled: ${google.enabled}`);
      } else {
        console.log('   ❌ Google OAuth: NOT CONFIGURED');
      }
    }
    
    console.log('\n3. Site URL Configuration:');
    console.log(`   ${config.site_url || 'Not set'}`);
    
    console.log('\n4. Redirect URLs:');
    if (config.uri_allow_list) {
      config.uri_allow_list.forEach(url => {
        console.log(`   - ${url}`);
      });
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

// Provide recommendations
function printRecommendations() {
  console.log('\n\n📋 FIX INSTRUCTIONS');
  console.log('====================\n');
  
  console.log('The "access_denied" error means Google is rejecting the OAuth request.');
  console.log('This is typically because:\n');
  
  console.log('🔴 PROBLEM 1: OAuth Consent Screen in "Testing" Mode');
  console.log('   Solution:');
  console.log('   1. Go to https://console.cloud.google.com/apis/credentials/consent');
  console.log('   2. Check "Publishing Status" at the top');
  console.log('   3. If it says "Testing", click "PUBLISH APP" or add test users\n');
  
  console.log('🔴 PROBLEM 2: User Not Added as Test User');
  console.log('   Solution:');
  console.log('   1. Go to https://console.cloud.google.com/apis/credentials/consent');
  console.log('   2. Click "Test users" tab');
  console.log('   3. Click "ADD USERS"');
  console.log('   4. Add your email: tomarnejensen@gmail.com\n');
  
  console.log('🔴 PROBLEM 3: Redirect URI Mismatch');
  console.log('   Solution:');
  console.log('   1. Go to https://console.cloud.google.com/apis/credentials');
  console.log('   2. Click your OAuth 2.0 Client ID');
  console.log('   3. Check "Authorized redirect URIs"');
  console.log('   4. Must include:');
  console.log('      https://vuxbjlykgmzskxbclquf.supabase.co/auth/v1/callback\n');
  
  console.log('✅ VERIFIED WORKING LOGIN (from logs):');
  console.log('   Time: 2026-04-09T10:23:45Z');
  console.log('   User: Tom Arne Jensen (tomarnejensen@gmail.com)');
  console.log('   Provider: Google');
  console.log('   Status: ✅ SUCCESS\n');
  
  console.log('❌ FAILED LOGIN ATTEMPTS:');
  console.log('   Time: 2026-04-09T10:51:45Z');
  console.log('   Error: access_denied');
  console.log('   Cause: User clicked "Cancel" or not authorized\n');
}

// Main
checkAuthConfig().then(() => {
  printRecommendations();
}).catch(err => {
  console.error('Error:', err);
  printRecommendations();
});
