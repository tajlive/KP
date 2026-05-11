import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tablesToTruncate = [
  'trades',
  'trading_sessions',
  'wallets',
  'portfolio_rebalance_events',
  'portfolio_rebalance_orders',
  'ai_decision_log',
  'trading_signals',
  'bot_health',
  'notifications'
];

async function resetSystem() {
  console.log('🚀 Starting full system reset...');

  for (const table of tablesToTruncate) {
    console.log(`Cleaning table ${table}...`);
    const { error } = await supabase.rpc('exec_sql', { query: `TRUNCATE TABLE public.${table} CASCADE;` });
    if (error) {
      console.warn(`Could not truncate ${table} via exec_sql (expected if not exists), trying DELETE:`, error.message);
      const { error: deleteError } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (deleteError) console.error(`Failed to clean ${table}:`, deleteError.message);
    }
  }

  console.log('Resetting user_profiles.paper_balance to 10,000...');
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ paper_balance: 10000.00 })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (profileError) console.error('Failed to reset paper_balance:', profileError.message);

  console.log('Deactivating portfolio rebalance configs...');
  const { error: rebalanceError } = await supabase
    .from('portfolio_rebalance_configs')
    .update({ is_active: false })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (rebalanceError) console.error('Failed to deactivate rebalance configs:', rebalanceError.message);

  console.log('Deactivating user strategies...');
  const { error: strategyError } = await supabase
    .from('user_strategies')
    .update({ is_active: false })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (strategyError) console.warn('user_strategies update failed (might not exist):', strategyError.message);

  console.log('✅ System reset complete! All trading data cleared and balances reset to 10,000 NOK.');
}

resetSystem();
