import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const EMAIL = process.env.E2E_USER_EMAIL || 'tom@klarpakke.no';
const PASSWORD = process.env.E2E_USER_PASSWORD;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

if (!PASSWORD) {
  console.error('❌ Missing E2E_USER_PASSWORD in .env.local');
  console.error('   Set it or run: npm run test:e2e:prepare');
  process.exit(1);
}

console.log('🔐 Testing login with verified credentials...');
console.log('   Email:', EMAIL, '\n');

const supabase = createClient(SUPABASE_URL, ANON_KEY);

const { data, error } = await supabase.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});

if (error) {
  console.error('❌ Login failed:', error.message);
  console.error('\nNext steps:');
  console.error('  1. Verify the user exists in Supabase Auth');
  console.error('  2. Run: npm run test:e2e:prepare');
  console.error('     or: node scripts/create-test-users.js --from-env');
  process.exit(1);
} else {
  console.log('✅ Login successful!\n');
  console.log('User:');
  console.log('  ID:', data.user.id);
  console.log('  Email:', data.user.email);
  console.log('  Confirmed:', !!data.user.email_confirmed_at);
  console.log('');
  console.log('Session:');
  console.log('  Expires:', new Date(data.session.expires_at * 1000).toLocaleString());
  console.log('');
  console.log('✅ Ready for E2E testing!');
}
