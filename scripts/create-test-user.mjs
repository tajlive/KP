import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('Creating test user...');

// Try with more explicit options
const { data, error } = await supabase.auth.admin.createUser({
  email: 'tom@klarpakke.no',
  password: 'TestPassword123!',
  email_confirm: true,
  user_metadata: { full_name: 'Test User' },
  app_metadata: { provider: 'email' },
});

if (error) {
  console.error('Error:', error);
  console.error('Message:', error.message);
  console.error('Status:', error.status);
} else {
  console.log('Success!');
  console.log('User:', data.user);
}
