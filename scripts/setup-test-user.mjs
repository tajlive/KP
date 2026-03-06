#!/usr/bin/env node
/**
 * Setup test user for E2E testing
 * 
 * Usage:
 *   node scripts/setup-test-user.mjs
 * 
 * Requires:
 *   - SUPABASE_SERVICE_ROLE_KEY (in .env.local)
 *   - NEXT_PUBLIC_SUPABASE_URL (in .env.local)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env from .env.local
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const TEST_EMAIL = 'test@klarpakke.com';
const TEST_PASSWORD = 'TestPassword123!';

console.log('🔧 Setting up test user...');
console.log('   URL:', SUPABASE_URL);
console.log('   Email:', TEST_EMAIL);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupTestUser() {
  try {
    // First, check if user already exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Failed to list users:', listError.message);
      return;
    }

    const existingUser = users.find(u => u.email === TEST_EMAIL);
    
    if (existingUser) {
      console.log('✅ Test user already exists:', existingUser.id);
      console.log('   Email confirmed:', !!existingUser.email_confirmed_at);
      
      // Try to sign in to verify password works
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      
      if (signInError) {
        console.log('⚠️  User exists but password may be wrong');
        console.log('   Attempting to update password...');
        
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { password: TEST_PASSWORD }
        );
        
        if (updateError) {
          console.error('❌ Failed to update password:', updateError.message);
        } else {
          console.log('✅ Password updated successfully');
        }
      } else {
        console.log('✅ Sign-in verified - credentials work!');
      }
      
      return;
    }

    // Create new test user
    console.log('🆕 Creating new test user...');
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User',
      },
    });

    if (error) {
      console.error('❌ Failed to create user:', error.message);
      return;
    }

    console.log('✅ Test user created successfully!');
    console.log('   ID:', data.user.id);
    console.log('   Email:', data.user.email);
    console.log('   Email confirmed:', !!data.user.email_confirmed_at);

    // Verify sign-in works
    console.log('🧪 Testing sign-in...');
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (signInError) {
      console.error('❌ Sign-in test failed:', signInError.message);
    } else {
      console.log('✅ Sign-in test passed!');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

setupTestUser();
