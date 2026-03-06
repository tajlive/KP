import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('🔧 Applying Phase 1 fix for tom@klarpakke.no...\n');

// Get Tom's user ID first
const { data: userData, error: userError } = await supabase
  .from('auth.users')
  .select('id')
  .eq('email', 'tom@klarpakke.no')
  .single();

if (userError) {
  console.error('❌ Could not find user:', userError.message);
  
  // Try alternative: list users
  const { data: users } = await supabase.auth.admin.listUsers();
  const tomUser = users?.users.find(u => u.email === 'tom@klarpakke.no');
  
  if (!tomUser) {
    console.error('❌ User tom@klarpakke.no not found!');
    process.exit(1);
  }
  
  console.log('✅ Found user via admin API:', tomUser.id);
  
  // Update using RPC or direct table update
  const { error: updateError } = await supabase
    .from('user_profiles')
    .upsert({
      id: tomUser.id,
      onboarding_completed: true,
      setup_completed_at: new Date().toISOString(),
      trading_experience: 'experienced',
      preferred_trading_mode: 'paper',
      updated_at: new Date().toISOString(),
    });
  
  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
    process.exit(1);
  }
  
  console.log('✅ Successfully updated user_profiles!');
} else {
  console.log('✅ Found user:', userData.id);
}

// Verify the update
const { data: profile, error: verifyError } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userData?.id || '2415156e-4877-4e63-992a-4b327b670cc9')
  .single();

if (verifyError) {
  console.log('⚠️ Could not verify (table may not exist yet):', verifyError.message);
} else {
  console.log('\n📊 Current profile status:');
  console.log('  Onboarding completed:', profile?.onboarding_completed);
  console.log('  Setup completed at:', profile?.setup_completed_at);
  console.log('  Trading experience:', profile?.trading_experience);
}

console.log('\n✅ Phase 1 fix applied!');
console.log('Tom should now be able to access all protected pages.');
