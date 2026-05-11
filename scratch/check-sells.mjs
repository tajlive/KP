import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSells(userId) {
  const { data: sells, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .eq('side', 'sell')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Sells query failed:', error.message);
    return;
  }
  
  console.log(`User: ${userId}`);
  console.log(`Total Sells: ${sells.length}`);
  
  if (sells.length > 0) {
    console.log('\nLast 10 sells:');
    console.table(sells.slice(0, 10).map(t => ({
      created: t.created_at,
      symbol: t.symbol,
      pnl: t.pnl_nok,
      realized_pnl: t.realized_pnl,
      status: t.status
    })));
  } else {
    console.log('No sell trades found. This explains 0% win rate if PnL is only on sells.');
  }
}

checkSells('6408d389-2021-4a2f-92b6-bebf0459a398');
