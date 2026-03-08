import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sql } = await req.json();
    
    if (!sql) {
      return new Response(
        JSON.stringify({ error: 'SQL statement required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get database URL from environment
    const dbUrl = Deno.env.get('SUPABASE_DB_URL') || 
      `postgresql://postgres:${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}@db.${Deno.env.get('SUPABASE_PROJECT_REF')}.supabase.co:5432/postgres`;
    
    // Execute SQL using Deno postgres driver
    const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
    
    // Parse connection from Supabase env vars
    const projectRef = Deno.env.get('SUPABASE_PROJECT_REF') || 'vuxbjlykgmzskxbclquf';
    const password = Deno.env.get('SUPABASE_DB_PASSWORD') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    const client = new Client({
      hostname: `db.${projectRef}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: password,
      tls: { enabled: false },
    });

    await client.connect();
    const result = await client.queryObject(sql);
    await client.end();

    return new Response(
      JSON.stringify({ success: true, rows: result.rows, rowCount: result.rowCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
