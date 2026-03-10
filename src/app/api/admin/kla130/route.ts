import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// KLA-108: Admin-guard
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: 'Ikke autentisert', status: 401 };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: 'Ingen tilgang', status: 403 };
  }

  return { user };
}

export async function POST(req: NextRequest) {
  try {
    // KLA-108: Sjekk admin
    const auth = await requireAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const supabase = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // SQL statements for KLA-130
    const statements = [
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

    const results = [];
    for (const sql of statements) {
      try {
        // Try to execute via RPC if available
        const { data, error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
          results.push({ success: false, error: error.message, sql: sql.substring(0, 50) });
        } else {
          results.push({ success: true, data });
        }
      } catch (e: unknown) {
        const err = e as Error;
        results.push({ success: false, error: err.message, sql: sql.substring(0, 50) });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
