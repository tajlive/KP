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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://pskhryjzkobytnfwucrb.supabase.co';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // SQL statements
    const statements = [
      `CREATE TABLE IF NOT EXISTS trading_sessions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        mode TEXT DEFAULT 'paper',
        strategy_id TEXT DEFAULT 'manual',
        trading_pair TEXT DEFAULT 'BTCUSDT',
        starting_capital_nok DECIMAL(20,8) DEFAULT 100000.00,
        current_capital_nok DECIMAL(20,8) DEFAULT 100000.00,
        initial_capital DECIMAL(20,8) DEFAULT 100000.00,
        current_capital DECIMAL(20,8) DEFAULT 100000.00,
        total_pnl DECIMAL(20,8) DEFAULT 0,
        total_trades INTEGER DEFAULT 0,
        winning_trades INTEGER DEFAULT 0,
        losing_trades INTEGER DEFAULT 0,
        status TEXT CHECK (status IN ('active', 'paused', 'stopped', 'crashed')) DEFAULT 'active',
        strategy_config JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        started_at TIMESTAMPTZ DEFAULT NOW(),
        last_heartbeat TIMESTAMPTZ DEFAULT NOW()
      );`,
      
      `CREATE TABLE IF NOT EXISTS risk_profiles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        name TEXT NOT NULL CHECK (name IN ('forsiktig', 'moderat', 'aggressiv')),
        max_position_size_pct DECIMAL(5,2) NOT NULL,
        stop_loss_pct DECIMAL(5,2) NOT NULL,
        max_total_exposure_pct DECIMAL(5,2) NOT NULL,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, name)
      );`,
      
      `CREATE TABLE IF NOT EXISTS auto_trading_configs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        risk_profile_id UUID REFERENCES risk_profiles(id) ON DELETE CASCADE,
        is_enabled BOOLEAN DEFAULT false,
        strategy TEXT NOT NULL CHECK (strategy IN ('dca', 'grid', 'momentum', 'combined')),
        config JSONB DEFAULT '{}',
        last_executed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );`,
      
      `ALTER TABLE trading_sessions ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE risk_profiles ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE auto_trading_configs ENABLE ROW LEVEL SECURITY;`,
    ];

    const results = [];
    
    for (const sql of statements) {
      try {
        const queryResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
          },
          body: JSON.stringify({ query: sql })
        });
        
        results.push({ 
          sql: sql.substring(0, 30), 
          status: queryResponse.status,
          ok: queryResponse.ok
        });
      } catch (e: any) {
        results.push({ 
          sql: sql.substring(0, 30), 
          error: e.message 
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
