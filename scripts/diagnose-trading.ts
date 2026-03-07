import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnose() {
  console.log('🔍 DIAGNOSTIKK: Paper Trading + Auto Trade\n');
  const tables = ['paper_trading_sessions', 'risk_profiles', 'auto_trading_configs'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    console.log(error ? `❌ ${table}: ${error.message}` : `✅ ${table}: EXISTS`);
  }
}

diagnose().catch(console.error);
