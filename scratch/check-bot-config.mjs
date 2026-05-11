import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBotConfig(userId) {
  const { data: configs, error } = await supabase
    .from('auto_trading_configs')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Configs query failed:', error.message);
    return;
  }
  
  console.log(`User: ${userId}`);
  console.log(`Configs found: ${configs.length}`);
  console.table(configs.map(c => ({
    id: c.id,
    enabled: c.is_enabled,
    strategy: c.strategy_id,
    mode: c.mode,
    risk: c.risk_level
  })));
}

checkBotConfig('6408d389-2021-4a2f-92b6-bebf0459a398');
