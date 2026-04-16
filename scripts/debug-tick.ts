import { createClient } from '@supabase/supabase-js';
const db = createClient('https://vuxbjlykgmzskxbclquf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eGJqbHlrZ216c2t4YmNscXVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY3MDkxNCwiZXhwIjoyMDg2MjQ2OTE0fQ.xgqK_imYc7rkezSt6tUJvcEOm61AQ0x9de-ZDAX6fys');

async function main() {
  const { data } = await db.from('trading_signals')
    .select('id, symbol, action, agent_id, signal_type, created_at')
    .eq('signal_type', 'ensemble_ai')
    .eq('symbol', 'BTCUSDT')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('Signals:', JSON.stringify(data, null, 2));
}
main();
