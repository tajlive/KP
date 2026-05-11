import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function reconstructBalances(userId) {
  const { data: trades, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'filled');
  
  if (error) {
    console.error('Trades query failed:', error.message);
    return;
  }
  
  const balances = {
    NOK: 10000, // Initial capital from session
  };
  
  for (const t of trades) {
    const symbol = t.symbol || 'UNKNOWN';
    const side = t.side;
    const qty = Number(t.quantity || 0);
    const val = Number(t.total_value || 0);
    const fee = Number(t.fee || 0);
    
    if (!balances[symbol]) balances[symbol] = 0;
    
    if (side === 'buy') {
      balances[symbol] += qty;
      balances.NOK -= (val + fee);
    } else if (side === 'sell') {
      balances[symbol] -= qty;
      balances.NOK += (val - fee);
    }
  }
  
  console.log('Reconstructed Balances:');
  console.log(JSON.stringify(balances, null, 2));
}

reconstructBalances('6408d389-2021-4a2f-92b6-bebf0459a398');
