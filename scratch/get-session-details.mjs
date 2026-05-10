
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getSessionDetails() {
  const userId = '6408d389-2021-4a2f-92b6-bebf0459a398';
  
  const { data: sessions, error } = await supabase
    .from('trading_sessions')
    .select('id, trading_pair, mode, strategy_id, current_capital, total_trades, started_at')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Active sessions for user ${userId}:`);
  sessions.forEach(s => {
    console.log(`- [${s.mode}] ${s.trading_pair} (${s.strategy_id}) | Trades: ${s.total_trades} | Capital: ${s.current_capital} | Started: ${s.started_at}`);
  });
}

getSessionDetails();
