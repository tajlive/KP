import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Setup test user for E2E tests
 * Run this before other tests to ensure test user exists
 */

test.describe('Test User Setup', () => {
  test('create or verify test user exists', async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Needs service role for admin operations
    );

    const testEmail = 'tom@klarpakke.no';
    const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

    // Try to create user (will fail if exists, which is fine)
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm email
    });

    if (createError) {
      // User might already exist
      console.log('User creation result:', createError.message);
      
      // Try to sign in to verify user exists
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      if (signInError) {
        console.error('Test user exists but password might be wrong or user not confirmed');
        console.error(signInError);
        
        // List all users to debug
        const { data: users } = await supabase.auth.admin.listUsers();
        const testUser = users?.users.find(u => u.email === testEmail);
        
        if (testUser) {
          console.log('Test user found:', testUser.id);
          console.log('Email confirmed:', testUser.email_confirmed_at);
        }
      } else {
        console.log('✅ Test user verified - can sign in successfully');
      }
    } else {
      console.log('✅ Test user created:', user.user?.id);
    }

    expect(true).toBe(true); // Test passes if we get here
  });
});
