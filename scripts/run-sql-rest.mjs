#!/usr/bin/env node
/**
 * Execute SQL via Supabase REST API
 */

const SUPABASE_URL = 'https://vuxbjlykgmzskxbclquf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eGJqbHlrZ216c2t4YmNscXVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY3MDkxNCwiZXhwIjoyMDg2MjQ2OTE0fQ.xgqK_imYc7rkezSt6tUJvcEOm61AQ0x9de-ZDAX6fys';

const sqlStatements = [
  // Create exec_sql function first
  `CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
  RETURNS VOID AS $$
  BEGIN
    EXECUTE sql;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;`,
  
  // Create kltbalances table
  `CREATE TABLE IF NOT EXISTS public.kltbalances (
    userid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance BIGINT NOT NULL DEFAULT 500 CHECK (balance >= 0),
    total_earned BIGINT NOT NULL DEFAULT 500,
    total_spent BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );`,
  
  // Enable RLS
  `ALTER TABLE public.kltbalances ENABLE ROW LEVEL SECURITY;`,
  
  // Drop existing policies
  `DROP POLICY IF EXISTS "Users can view own klt balance" ON public.kltbalances;`,
  `DROP POLICY IF EXISTS "Service can manage klt balances" ON public.kltbalances;`,
  
  // Create policies
  `CREATE POLICY "Users can view own klt balance"
    ON public.kltbalances FOR SELECT
    USING (auth.uid() = userid);`,
  
  `CREATE POLICY "Service can manage klt balances"
    ON public.kltbalances FOR ALL
    USING (true)
    WITH CHECK (true);`,
  
  // Grant permissions
  `GRANT SELECT ON public.kltbalances TO authenticated;`,
  `GRANT ALL ON public.kltbalances TO service_role;`,
  
  // Create index
  `CREATE INDEX IF NOT EXISTS idx_kltbalances_userid ON public.kltbalances(userid);`,
  
  // Create trigger function
  `CREATE OR REPLACE FUNCTION public.handle_new_user_klt()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO public.kltbalances (userid, balance, total_earned)
    VALUES (NEW.id, 500, 500)
    ON CONFLICT (userid) DO NOTHING;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;`,
  
  // Drop existing trigger
  `DROP TRIGGER IF EXISTS new_user_klt_bonus ON auth.users;`,
  
  // Create trigger
  `CREATE TRIGGER new_user_klt_bonus
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_klt();`,
];

async function execSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
    },
    body: JSON.stringify({ sql }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    return { ok: false, error };
  }
  
  const result = await response.json();
  return { ok: true, result };
}

async function main() {
  console.log('🔥 KLA-130: Executing SQL via REST API\n');
  
  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i];
    const preview = sql.split('\n')[0].substring(0, 50);
    console.log(`[${i + 1}/${sqlStatements.length}] ${preview}...`);
    
    try {
      const { ok, error, result } = await execSQL(sql);
      
      if (ok) {
        console.log(`  ✅ Success`);
      } else {
        console.log(`  ⚠️  Error: ${error.substring(0, 100)}`);
      }
    } catch (e) {
      console.log(`  ❌ Exception: ${e.message}`);
    }
  }
  
  console.log('\n✅ KLA-130 SQL execution complete!');
}

main().catch(console.error);
