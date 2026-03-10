/**
 * Opprett test-brukere i Supabase
 * 
 * Bruk:
 *   node scripts/create-test-users.js
 * 
 * Krever:
 *   - SUPABASE_URL (fra .env.local)
 *   - SUPABASE_SERVICE_ROLE_KEY (fra Supabase Dashboard > Settings > API)
 */

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Mangler SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Finn SERVICE_ROLE_KEY i Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const TEST_USERS = [
  {
    email: 'klarpakke.test+playwright@gmail.com',
    password: 'bilglass123',
    options: {
      data: { display_name: 'Test User A' },
      email_confirm: true
    }
  },
  {
    email: 'klarpakke.test+b@gmail.com',
    password: 'bilglass123',
    options: {
      data: { display_name: 'Test User B' },
      email_confirm: true
    }
  }
];

async function createUser(user) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      ...user.options
    })
  });

  const data = await response.json();
  
  if (!response.ok) {
    if (data.msg?.includes('already been registered') || data.message?.includes('already exists')) {
      console.log(`⚠️  ${user.email} finnes allerede`);
      return { exists: true };
    }
    throw new Error(data.msg || data.message || JSON.stringify(data));
  }
  
  return data;
}

async function main() {
  console.log('🔄 Oppretter test-brukere i Supabase...\n');

  for (const user of TEST_USERS) {
    try {
      const result = await createUser(user);
      if (!result.exists) {
        console.log(`✅ Opprettet: ${user.email}`);
        console.log(`   ID: ${result.id}`);
      }
    } catch (err) {
      console.error(`❌ Feil for ${user.email}:`, err.message);
    }
  }

  console.log('\n📋 Oppsummering:');
  console.log('   Bruker A: klarpakke.test+playwright@gmail.com / bilglass123');
  console.log('   Bruker B: klarpakke.test+b@gmail.com / bilglass123');
  console.log('\n   Verifiser i Supabase Dashboard > Authentication > Users');
}

main().catch(console.error);
