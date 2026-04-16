import { createClient } from '@supabase/supabase-js';
const db = createClient('https://vuxbjlykgmzskxbclquf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eGJqbHlrZ216c2t4YmNscXVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY3MDkxNCwiZXhwIjoyMDg2MjQ2OTE0fQ.xgqK_imYc7rkezSt6tUJvcEOm61AQ0x9de-ZDAX6fys');

async function main() {
  const { data, error } = await db.from('trading_signals').insert({
    symbol: 'BTCUSDT',
    action: 'buy',
    confidence: 72,
    entry_price: 85000,
    reasoning: 'Demo signal for pipeline verification',
    signal_type: 'ensemble_ai',
    status: 'active',
    ensemble_run_id: 'demo-run-' + Date.now(),
    agent_id: 'ensemble_master',
    agent_weight: 1.0,
    model_version: 'ensemble-v2',
    feature_version: '1h-basic',
  } as any).select();
  console.log('Insert result:', { data, error });
}
main();
