#!/usr/bin/env node
/**
 * Execute SQL via Supabase Edge Function
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://vuxbjlykgmzskxbclquf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eGJqbHlrZ216c2t4YmNscXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzA5MTQsImV4cCI6MjA4NjI0NjkxNH0.9b45CqICVUMkq-ByRZFr5LkC2QcvFedUzsWO2kVfkC4';

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/exec-sql`;

const sqlStatements = [
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
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });
  
  const result = await response.json();
  return { ok: response.ok, status: response.status, result };
}

async function main() {
  console.log('🔥 KLA-130: Executing SQL via Edge Function\n');
  
  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i];
    const preview = sql.split('\n')[0].substring(0, 50);
    console.log(`[${i + 1}/${sqlStatements.length}] ${preview}...`);
    
    try {
      const { ok, status, result } = await execSQL(sql);
      
      if (ok) {
        console.log(`  ✅ Success`);
      } else {
        console.log(`  ⚠️  Status ${status}: ${result.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
    }
  }
  
  console.log('\n✅ KLA-130 SQL execution complete!');
}

main().catch(console.error);
