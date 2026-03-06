import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const EMAIL = 'tom@klarpakke.no';
const PASSWORDS = ['bilglass', 'bilglass123', 'Viking123'];

console.log('🔑 Testing passwords for:', EMAIL);
console.log('');

const supabase = createClient(SUPABASE_URL, ANON_KEY);

for (const password of PASSWORDS) {
  process.stdout.write(`Testing "${password}"... `);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: password,
  });
  
  if (error) {
    console.log('❌ FAILED');
    console.log('   Error:', error.message);
  } else {
    console.log('✅ SUCCESS!');
    console.log('   User ID:', data.user?.id);
    console.log('');
    console.log('🎉 CORRECT PASSWORD:', password);
    console.log('');
    console.log('Add to .env.local:');
    console.log(`TEST_USER_PASSWORD=${password}`);
    process.exit(0);
  }
  
  console.log('');
}

console.log('❌ None of the passwords worked');
console.log('');
console.log('You may need to reset your password at:');
console.log('https://app.supabase.com/project/vuxbjlykgmzskxbclquf/auth/users');
