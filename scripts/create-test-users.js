/**
 * Opprett test-brukere i Supabase
 *
 * Bruk:
 *   node scripts/create-test-users.js
 *   eller: node --env-file=.env.local scripts/create-test-users.js
 *
 * Krever:
 *   - NEXT_PUBLIC_SUPABASE_URL (fra .env.local)
 *   - SUPABASE_SERVICE_ROLE_KEY (fra Supabase Dashboard > Settings > API)
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env.local if present (ESM, no dotenv dep)
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Mangler SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Finn SERVICE_ROLE_KEY i Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const TEST_USERS = [
  {
    email: 'tom@klarpakke.no',
    password: 'TestPassword123!',
    options: {
      data: { display_name: 'E2E Test User' },
      email_confirm: true
    }
  },
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

/** Oppdater passord for eksisterende bruker (sikrer at testbruker alltid har forventet passord). */
async function updateUserPassword(userId, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password })
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.msg || data.message || response.statusText);
  }
  return response.json();
}

/** Hent bruker-ID fra e-post (liste brukere). */
async function findUserByEmail(email) {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`,
    {
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      }
    }
  );
  if (!response.ok) throw new Error('Kunne ikke liste brukere');
  const { users } = await response.json();
  return users?.find((u) => u.email === email)?.id ?? null;
}

async function main() {
  console.log('🔄 Oppretter / oppdaterer test-brukere i Supabase...\n');

  for (const user of TEST_USERS) {
    try {
      const result = await createUser(user);
      if (result.exists) {
        const uid = await findUserByEmail(user.email);
        if (uid) {
          await updateUserPassword(uid, user.password);
          console.log(`✅ Passord oppdatert for ${user.email}`);
        }
      } else {
        console.log(`✅ Opprettet: ${user.email}`);
        console.log(`   ID: ${result.id}`);
      }
    } catch (err) {
      console.error(`❌ Feil for ${user.email}:`, err.message);
    }
  }

  console.log('\n📋 Oppsummering:');
  console.log('   E2E (default): tom@klarpakke.no / TestPassword123!');
  console.log('   Bruker A: klarpakke.test+playwright@gmail.com / bilglass123');
  console.log('   Bruker B: klarpakke.test+b@gmail.com / bilglass123');
  console.log('\n   Verifiser i Supabase Dashboard > Authentication > Users');
}

main().catch(console.error);
