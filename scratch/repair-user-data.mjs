import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function repairUserWallets(userId) {
  // 1. Reconstruct balances from trades
  const { data: trades, error: tradesError } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'filled');
  
  if (tradesError) {
    console.error('Trades query failed:', tradesError.message);
    return;
  }
  
  const balances = {
    NOK: 10000, // Initial capital
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

  console.log('Final reconstructed balances:', balances);

  // 2. Update wallets table
  // First, clear existing paper-related wallets or reset them
  for (const [currency, balance] of Object.entries(balances)) {
    console.log(`Updating ${currency} wallet for user ${userId} to ${balance}...`);
    const { error: walletError } = await supabase
      .from('wallets')
      .update({ balance: balance })
      .eq('user_id', userId)
      .eq('currency', currency);
    
    if (walletError) {
      console.error(`Failed to update ${currency} wallet:`, walletError.message);
    }
  }

  // 3. Update user_profile.paper_balance
  console.log(`Updating paper_balance for user ${userId} to ${balances.NOK}...`);
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ paper_balance: balances.NOK })
    .eq('id', userId);
  
  if (profileError) {
    console.error('Failed to update user profile:', profileError.message);
  }

  console.log('Repair complete!');
}

repairUserWallets('6408d389-2021-4a2f-92b6-bebf0459a398');
