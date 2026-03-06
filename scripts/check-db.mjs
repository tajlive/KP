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

console.log('🔍 Checking database structure...\n');

// Check what tables exist
const { data: tables, error: tablesError } = await supabase
  .from('information_schema.tables')
  .select('table_name')
  .eq('table_schema', 'public');

if (tablesError) {
  console.error('❌ Could not list tables:', tablesError.message);
} else {
  console.log('📋 Tables in public schema:');
  const tableNames = tables.map(t => t.table_name);
  console.log(tableNames.join(', '));
  
  if (tableNames.includes('profiles')) {
    console.log('\n✅ Found: profiles');
  }
  if (tableNames.includes('user_profiles')) {
    console.log('✅ Found: user_profiles');
  }
}

// Check Tom's user
const { data: users } = await supabase.auth.admin.listUsers();
const tomUser = users?.users.find(u => u.email === 'tom@klarpakke.no');

if (tomUser) {
  console.log('\n👤 Tom user found:', tomUser.id);
  
  // Check profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', tomUser.id)
    .single();
  
  if (profileError) {
    console.log('❌ No profile in "profiles" table:', profileError.message);
  } else {
    console.log('\n📊 Profile in "profiles" table:');
    console.log(profile);
  }
} else {
  console.log('❌ Tom user not found!');
}
