import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get credentials from environment
    const projectRef = Deno.env.get('SUPABASE_PROJECT_REF') || 'vuxbjlykgmzskxbclquf';
    const password = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // Connect to database using SESSION pooler (port 5432)
    const client = new Client({
      hostname: `aws-0-eu-central-1.pooler.supabase.com`,
      port: 5432,
      database: 'postgres',
      user: `postgres.${projectRef}`,
      password: password,
      tls: { enabled: true },
    });

    await client.connect();

    // Execute KLA-130 SQL
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

    const results = [];
    for (const sql of sqlStatements) {
      try {
        const result = await client.queryObject(sql);
        results.push({ success: true, command: result.command });
      } catch (e) {
        results.push({ success: false, error: e.message, sql: sql.substring(0, 50) });
      }
    }

    await client.end();

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
