import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAnomalies() {
  const anomalies = [];

  // 1. Check for identical non-zero wallet balances (Sync Bug Detection)
  const { data: syncAnomalies, error: syncError } = await supabase.rpc('exec_sql_query', {
    query_text: "SELECT jsonb_build_object('user_id', user_id, 'balance', balance, 'count', count(*)) as result FROM public.wallets GROUP BY user_id, balance HAVING count(*) > 2 AND balance != 0"
  });
  
  if (syncError) {
    // Fallback if rpc fails
    const { data: allWallets } = await supabase.from('wallets').select('user_id, currency, balance');
    const userGroups = {};
    allWallets?.forEach(w => {
      if (!userGroups[w.user_id]) userGroups[w.user_id] = {};
      if (w.balance != 0) {
        userGroups[w.user_id][w.balance] = (userGroups[w.user_id][w.balance] || 0) + 1;
      }
    });
    Object.entries(userGroups).forEach(([userId, balances]) => {
      Object.entries(balances).forEach(([balance, count]) => {
        if (count > 2) anomalies.push({ type: 'SYNC_BUG_DETECTED', userId, balance, count });
      });
    });
  } else if (syncAnomalies) {
    syncAnomalies.forEach(a => anomalies.push({ type: 'SYNC_BUG_DETECTED', ...a.result }));
  }

  // 2. Check for negative paper balances
  const { data: negativeBalances } = await supabase
    .from('user_profiles')
    .select('id, email, paper_balance')
    .lt('paper_balance', 0);
  
  negativeBalances?.forEach(u => {
    anomalies.push({ type: 'NEGATIVE_BALANCE', userId: u.id, email: u.email, balance: u.paper_balance });
  });

  // 3. Check for stuck rebalance events
  const { data: stuckEvents } = await supabase
    .from('portfolio_rebalance_events')
    .select('id, user_id, status, created_at')
    .in('status', ['pending', 'in_progress'])
    .lt('created_at', new Date(Date.now() - 3600000).toISOString()); // Older than 1h
  
  stuckEvents?.forEach(e => {
    anomalies.push({ type: 'STUCK_REBALANCE', eventId: e.id, userId: e.user_id, createdAt: e.created_at });
  });

  // 4. Priority User Monitoring (Hanne Nilsen)
  const priorityEmail = 'hanne.nilsen@outlook.com';
  const { data: priorityUser } = await supabase
    .from('user_profiles')
    .select('id, email, is_priority')
    .eq('email', priorityEmail)
    .single();

  if (priorityUser) {
    // If user exists, ensure they are marked as priority
    if (!priorityUser.is_priority) {
      await supabase.from('user_profiles').update({ is_priority: true }).eq('id', priorityUser.id);
    }

    // Check for failed trades in the last 24h for this user
    const { data: failedTrades } = await supabase
      .from('trades')
      .select('id, symbol, side, status, created_at')
      .eq('user_id', priorityUser.id)
      .eq('status', 'FAILED')
      .gt('created_at', new Date(Date.now() - 86400000).toISOString());

    if (failedTrades && failedTrades.length > 0) {
      anomalies.push({ 
        type: 'PRIORITY_USER_FAILURE', 
        email: priorityEmail, 
        count: failedTrades.length, 
        trades: failedTrades 
      });
    }
  }

  return anomalies;
}

async function runMonitor() {
  console.log('🛸 Antigravity Deep Health Monitor starting...');
  const anomalies = await checkAnomalies();
  
  const report = {
    timestamp: new Date().toISOString(),
    status: anomalies.length > 0 ? 'ANOMALY_DETECTED' : 'HEALTHY',
    anomalies_count: anomalies.length,
    anomalies
  };

  console.log(JSON.stringify(report, null, 2));

  // Log to bot_health for AI visibility
  await supabase.from('bot_health').upsert({
    bot_name: 'antigravity-monitor',
    status: anomalies.length > 0 ? 'warning' : 'ok',
    last_heartbeat: new Date().toISOString(),
    metadata: report,
    updated_at: new Date().toISOString()
  }, { onConflict: 'bot_name' });

  if (anomalies.length > 0) {
    console.error(`🚨 Found ${anomalies.length} system anomalies!`);
    process.exit(1);
  }
  
  console.log('✅ System health verified.');
  process.exit(0);
}

runMonitor();
