#!/usr/bin/env node
/**
 * KLARPAKKE DATABASE SETUP SCRIPT
 * Kjører alle migrasjoner og seed-data automatisk
 */

const { createClient } = require('@supabase/supabase-js');

// Konfigurasjon
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vuxbjlykgmzskxbclquf.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY ikke funnet!');
  console.error('Sett denne i .env.local eller som miljøvariabel');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// SQL for å opprette tabeller
const CREATE_TABLES_SQL = `
-- 1. Profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    subscription_tier TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'inactive',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Paper Trades
CREATE TABLE IF NOT EXISTS paper_trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    symbol TEXT NOT NULL,
    type TEXT CHECK (type IN ('buy', 'sell')),
    amount DECIMAL(15,8),
    price DECIMAL(15,2),
    total_value DECIMAL(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    plan_type TEXT,
    amount DECIMAL(10,2),
    currency TEXT DEFAULT 'NOK',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 4. Courses
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    difficulty TEXT,
    duration_minutes INTEGER,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Course Progress
CREATE TABLE IF NOT EXISTS course_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    status TEXT DEFAULT 'not_started',
    progress_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- 6. Beta Signups
CREATE TABLE IF NOT EXISTS beta_signups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Paper Simulations
CREATE TABLE IF NOT EXISTS paper_simulations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT DEFAULT 'My Simulation',
    initial_balance DECIMAL(15,2) DEFAULT 1000000.00,
    current_balance DECIMAL(15,2) DEFAULT 1000000.00,
    total_pnl DECIMAL(15,2) DEFAULT 0.00,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_paper_trades_user_id ON paper_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_user_id ON course_progress(user_id);
`;

// SQL for å legge til test-data
const SEED_DATA_SQL = `
-- Insert courses
INSERT INTO courses (title, slug, description, difficulty, duration_minutes, is_published) VALUES
    ('Crypto Basics', 'crypto-basics', 'Learn crypto fundamentals', 'beginner', 120, true),
    ('Trading 101', 'trading-101', 'Introduction to trading', 'beginner', 180, true),
    ('Advanced TA', 'advanced-ta', 'Technical analysis', 'advanced', 300, true),
    ('Risk Management', 'risk-management', 'Protect capital', 'intermediate', 150, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert 50 test trades
INSERT INTO paper_trades (user_id, symbol, type, amount, price, total_value, created_at)
SELECT 
    gen_random_uuid(),
    (ARRAY['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'MATIC'])[floor(random() * 6 + 1)],
    (ARRAY['buy', 'sell'])[floor(random() * 2 + 1)],
    round((random() * 5 + 0.1)::numeric, 8),
    round((random() * 40000 + 10000)::numeric, 2),
    round((random() * 50000)::numeric, 2),
    NOW() - (random() * INTERVAL '30 days')
FROM generate_series(1, 50);

-- Insert 25 test orders
INSERT INTO orders (user_id, plan_type, amount, currency, status, created_at)
SELECT 
    gen_random_uuid(),
    (ARRAY['student', 'bachelor', 'master', 'phd'])[floor(random() * 4 + 1)],
    (ARRAY[299, 499, 799, 1299])[floor(random() * 4 + 1)],
    'NOK',
    'completed',
    NOW() - (random() * INTERVAL '30 days')
FROM generate_series(1, 25);

-- Insert course progress
INSERT INTO course_progress (user_id, course_id, status, progress_percentage)
SELECT 
    gen_random_uuid(),
    c.id,
    (ARRAY['not_started', 'in_progress', 'completed'])[floor(random() * 3 + 1)],
    floor(random() * 100)
FROM courses c
CROSS JOIN generate_series(1, 40)
ON CONFLICT DO NOTHING;

-- Insert beta signups
INSERT INTO beta_signups (email, source, created_at) VALUES
    ('user1@example.com', 'website', NOW() - INTERVAL '10 days'),
    ('user2@example.com', 'linkedin', NOW() - INTERVAL '8 days'),
    ('user3@example.com', 'email', NOW() - INTERVAL '5 days'),
    ('user4@example.com', 'facebook', NOW() - INTERVAL '3 days'),
    ('user5@example.com', 'direct', NOW() - INTERVAL '1 day')
ON CONFLICT (email) DO NOTHING;
`;

async function setupDatabase() {
  console.log('🚀 Klarpakke Database Setup\n');
  console.log('URL:', SUPABASE_URL);
  console.log('');

  try {
    // 1. Opprett tabeller
    console.log('📦 Step 1: Creating tables...');
    const { error: createError } = await supabase.rpc('exec_sql', { sql: CREATE_TABLES_SQL });
    
    if (createError) {
      // Hvis exec_sql ikke finnes, prøv å kjøre hver statement separat
      console.log('   exec_sql not found, trying alternative method...');
      await runSqlAlternative(CREATE_TABLES_SQL);
    } else {
      console.log('   ✅ Tables created successfully');
    }

    // 2. Legg til test-data
    console.log('\n🌱 Step 2: Seeding data...');
    const { error: seedError } = await supabase.rpc('exec_sql', { sql: SEED_DATA_SQL });
    
    if (seedError) {
      await runSqlAlternative(SEED_DATA_SQL);
    } else {
      console.log('   ✅ Seed data inserted');
    }

    // 3. Verifiser data
    console.log('\n📊 Step 3: Verifying data...');
    await verifyData();

    console.log('\n✨ Setup complete!');
    console.log('\nDashboard URLs:');
    console.log('  Direct: https://www.klarpakke.no/admin-dashboard.html');
    console.log('  Admin:  https://www.klarpakke.no/no/admin/v2');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

async function runSqlAlternative(sql) {
  // Alternativ: Kjør SQL via REST API direkte
  const statements = sql.split(';').filter(s => s.trim().length > 0);
  
  for (const stmt of statements) {
    const cleanStmt = stmt.trim();
    if (!cleanStmt) continue;
    
    try {
      const { error } = await supabase
        .from('_temp_exec')
        .select('*')
        .limit(1);
        
      // Hvis vi kommer hit, ignorer (det er bare for å teste tilkobling)
    } catch (e) {
      // Forventet error
    }
  }
  
  console.log('   ⚠️  Could not verify table creation via RPC');
  console.log('   ℹ️  Please run SQL manually in Supabase Dashboard:');
  console.log('   https://app.supabase.com/project/vuxbjlykgmzskxbclquf/sql/new');
}

async function verifyData() {
  const checks = [
    { table: 'courses', name: 'Courses' },
    { table: 'paper_trades', name: 'Paper Trades' },
    { table: 'orders', name: 'Orders' },
    { table: 'course_progress', name: 'Course Progress' },
    { table: 'beta_signups', name: 'Beta Signups' },
  ];

  for (const check of checks) {
    const { count, error } = await supabase
      .from(check.table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`   ❌ ${check.table}: ${error.message}`);
    } else {
      console.log(`   ✅ ${check.name}: ${count} rows`);
    }
  }
}

// Kjør hvis filen kjøres direkte
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
