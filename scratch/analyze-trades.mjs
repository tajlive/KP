import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeTrades(userId) {
  const { data: trades, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Trades query failed:', error.message);
    return;
  }
  
  const total = trades.length;
  const winners = trades.filter(t => (t.pnl_nok || 0) > 0).length;
  const losers = trades.filter(t => (t.pnl_nok || 0) < 0).length;
  const neutrals = total - winners - losers;
  
  console.log(`User: ${userId}`);
  console.log(`Total Trades: ${total}`);
  console.log(`Winners: ${winners}`);
  console.log(`Losers: ${losers}`);
  console.log(`Neutrals: ${neutrals}`);
  console.log(`Win Rate: ${(winners / total * 100).toFixed(2)}%`);
  
  console.log('\nLast 10 trades:');
  console.table(trades.slice(0, 10).map(t => ({
    created: t.created_at,
    symbol: t.symbol,
    side: t.side,
    pnl: t.pnl_nok,
    status: t.status
  })));
}

analyzeTrades('6408d389-2021-4a2f-92b6-bebf0459a398');
