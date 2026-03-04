const { Client } = require('pg');

async function seed() {
  // Use the connection string for direct PG access
  // Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
  const conString = "postgresql://postgres.vuxbjlykgmzskxbclquf:Tompakk123!@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";
  const client = new Client(conString);
  
  try {
    await client.connect();
    console.log("Connected to Supabase Postgres.");

    const sql = `
-- 1. Create bots in auth.users
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES 
  ('b0700000-0000-0000-0000-000000000001', 'algo1@klarpakke.no', '{"tier": "professor"}'),
  ('b0700000-0000-0000-0000-000000000002', 'algo2@klarpakke.no', '{"tier": "phd"}'),
  ('b0700000-0000-0000-0000-000000000003', 'algo3@klarpakke.no', '{"tier": "phd"}')
ON CONFLICT (id) DO NOTHING;

-- 2. Create profiles
INSERT INTO public.profiles (id, display_name, tier, locale)
VALUES
  ('b0700000-0000-0000-0000-000000000001', 'Klarpakke DCA Algo', 'professor', 'no'),
  ('b0700000-0000-0000-0000-000000000002', 'Nordic Trend Following', 'phd', 'no'),
  ('b0700000-0000-0000-0000-000000000003', 'Volatility Harvester', 'phd', 'no')
ON CONFLICT (id) DO UPDATE 
SET display_name = EXCLUDED.display_name, tier = EXCLUDED.tier;

-- 3. Create trading sessions
INSERT INTO public.trading_sessions (id, user_id, status, strategy_id, mode)
VALUES
  ('sess-0000-000000000001', 'b0700000-0000-0000-0000-000000000001', 'active', 'auto', 'paper'),
  ('sess-0000-000000000002', 'b0700000-0000-0000-0000-000000000002', 'active', 'auto', 'paper'),
  ('sess-0000-000000000003', 'b0700000-0000-0000-0000-000000000003', 'active', 'auto', 'paper')
ON CONFLICT (id) DO NOTHING;

-- 4. Create trades to build up statistics
INSERT INTO public.trades (id, user_id, session_id, symbol, side, amount, entry_price, exit_price, pnl, status, executed_at)
SELECT gen_random_uuid(), 'b0700000-0000-0000-0000-000000000001', 'sess-0000-000000000001', 'BTCUSDT', 'buy', 0.1, 60000, 60500, 50.0, 'executed', now() - interval '1 day' * id
FROM generate_series(1, 15) as id;

INSERT INTO public.trades (id, user_id, session_id, symbol, side, amount, entry_price, exit_price, pnl, status, executed_at)
SELECT gen_random_uuid(), 'b0700000-0000-0000-0000-000000000002', 'sess-0000-000000000002', 'ETHUSDT', 'buy', 1.0, 3000, 3020, 20.0, 'executed', now() - interval '2 days' * id
FROM generate_series(1, 12) as id;

INSERT INTO public.trades (id, user_id, session_id, symbol, side, amount, entry_price, exit_price, pnl, status, executed_at)
SELECT gen_random_uuid(), 'b0700000-0000-0000-0000-000000000003', 'sess-0000-000000000003', 'SOLUSDT', 'buy', 10, 150, 151, 10.0, 'executed', now() - interval '1 day' * id
FROM generate_series(1, 10) as id;

-- Refresh view
REFRESH MATERIALIZED VIEW leaderboard;
    `;
    
    await client.query(sql);
    console.log("SQL executed successfully.");

  } catch (err) {
    console.error("Database connection error", err.stack);
  } finally {
    await client.end();
  }
}

seed();
