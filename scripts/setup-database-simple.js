#!/usr/bin/env node
/**
 * ENKEL DATABASE SETUP - Bruker Supabase REST API
 * Kjører SQL via /rest/v1/ endepunkter
 */

const https = require('https');

const SUPABASE_URL = 'https://vuxbjlykgmzskxbclquf.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ ERROR: Sett SUPABASE_SERVICE_ROLE_KEY i .env.local');
  console.error('');
  console.error('Eksempel:');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...');
  console.error('  node scripts/setup-database-simple.js');
  process.exit(1);
}

// SQL statements som skal kjøres
const SQL_STATEMENTS = [
  // Tabeller
  `CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    subscription_tier TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'inactive',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  
  `CREATE TABLE IF NOT EXISTS paper_trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    symbol TEXT NOT NULL,
    type TEXT CHECK (type IN ('buy', 'sell')),
    amount DECIMAL(15,8),
    price DECIMAL(15,2),
    total_value DECIMAL(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  
  `CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    plan_type TEXT,
    amount DECIMAL(10,2),
    currency TEXT DEFAULT 'NOK',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
  )`,
  
  `CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    difficulty TEXT,
    duration_minutes INTEGER,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  
  `CREATE TABLE IF NOT EXISTS course_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    status TEXT DEFAULT 'not_started',
    progress_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id)
  )`,
  
  `CREATE TABLE IF NOT EXISTS beta_signups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  
  // Courses seed data
  `INSERT INTO courses (title, slug, description, difficulty, duration_minutes, is_published) VALUES
    ('Crypto Basics', 'crypto-basics', 'Learn crypto fundamentals', 'beginner', 120, true),
    ('Trading 101', 'trading-101', 'Introduction to trading', 'beginner', 180, true),
    ('Advanced TA', 'advanced-ta', 'Technical analysis', 'advanced', 300, true),
    ('Risk Management', 'risk-management', 'Protect capital', 'intermediate', 150, true)
  ON CONFLICT (slug) DO NOTHING`,
  
  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email)`,
  `CREATE INDEX IF NOT EXISTS idx_paper_trades_user_id ON paper_trades(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`,
];

async function runSql(sql) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'vuxbjlykgmzskxbclquf.supabase.co',
      path: '/rest/v1/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      }
    };

    // Dessverre kan vi ikke kjøre SQL direkte via REST API uten RPC
    // Vi må bruke en annen tilnærming
    
    console.log('   SQL:', sql.substring(0, 60) + '...');
    resolve({ success: true });
  });
}

async function insertData(table, data) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(data)
    });
    
    return response.ok;
  } catch (e) {
    return false;
  }
}

async function checkTable(table) {
  const { count, error } = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`,
    {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'count=exact'
      }
    }
  ).then(r => ({
    count: r.headers.get('content-range')?.split('/')[1],
    error: !r.ok ? { message: r.statusText } : null
  }));
  
  return { count: parseInt(count) || 0, error };
}

async function main() {
  console.log('🚀 Klarpakke Database Setup\n');
  
  // Sjekk om tabellene allerede finnes
  console.log('📊 Checking existing tables...');
  
  const tables = ['courses', 'paper_trades', 'orders', 'course_progress', 'beta_signups'];
  const existing = [];
  const missing = [];
  
  for (const table of tables) {
    const { count, error } = await checkTable(table);
    if (error) {
      missing.push(table);
    } else {
      existing.push({ table, count });
    }
  }
  
  if (existing.length > 0) {
    console.log('   ✅ Existing tables:');
    existing.forEach(({ table, count }) => {
      console.log(`      - ${table}: ${count} rows`);
    });
  }
  
  if (missing.length > 0) {
    console.log('\n❌ Missing tables:');
    missing.forEach(t => console.log(`      - ${t}`));
    
    console.log('\n⚠️  Cannot create tables via REST API');
    console.log('');
    console.log('👉 Please run this SQL in Supabase Dashboard:');
    console.log('   https://app.supabase.com/project/vuxbjlykgmzskxbclquf/sql/new');
    console.log('');
    console.log('Or use Supabase CLI:');
    console.log('   npx supabase db push');
    console.log('');
    
    // Skriv ut SQL-filen
    console.log('📄 SQL file location:');
    console.log('   supabase/migrations/20240214_create_core_tables.sql');
    
  } else {
    console.log('\n✅ All tables exist!');
    
    // Sjekk om vi trenger seed-data
    const tradesCheck = await checkTable('paper_trades');
    if (tradesCheck.count === 0) {
      console.log('\n🌱 No data found. Please seed manually:');
      console.log('   supabase/seed.sql');
    } else {
      console.log(`\n✅ Database already has ${tradesCheck.count} trades`);
    }
  }
  
  console.log('\n📊 Dashboard will show real data once tables are created!');
}

main().catch(console.error);
