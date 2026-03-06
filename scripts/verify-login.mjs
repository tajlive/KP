import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const EMAIL = 'tom@klarpakke.no';
const PASSWORD = process.env.TEST_USER_PASSWORD;

console.log('🔐 Testing login with verified credentials...\n');

const supabase = createClient(SUPABASE_URL, ANON_KEY);

const { data, error } = await supabase.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});

if (error) {
  console.error('❌ Login failed:', error.message);
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
