const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnv(p) {
  const c = fs.readFileSync(p, 'utf8');
  const env = {};
  for (const l of c.split('\n')) {
    const t = l.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0,i).trim()] = t.slice(i+1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv('/Users/taj/klarpakke/.env.local');
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const COINS = {
  BTC: { price: 62600, pair: 'BTCUSDT' },
  ETH: { price: 1760, pair: 'ETHUSDT' },
  SOL: { price: 78.20, pair: 'SOLUSDT' }
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rnd(min, max) { return min + Math.random() * (max - min); }

async function main() {
  console.log('=== KLARPAKKE AUTO-TRADING CRON ===');
  console.log('Time:', new Date().toISOString());
  console.log('');

  // Get all paper accounts
  const { data: accounts, error: paErr } = await supabase
    .from('paper_accounts')
    .select('*');

  if (paErr) { console.error('paper_accounts:', paErr.message); process.exit(1); }
  if (!accounts.length) { console.log('No paper accounts.'); process.exit(0); }

  // Try to filter to test users (@klarpakke.test) via profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, display_name');

  const profileMap = {};
  if (profiles) {
    for (const p of profiles) profileMap[p.id] = p;
  }

  // Target: test users only, or all if none found
  let targetAccounts = accounts;
  if (profiles) {
    const testUserIds = new Set(
      profiles.filter(p => p.email && p.email.endsWith('@klarpakke.test')).map(p => p.id)
    );
    if (testUserIds.size > 0) {
      targetAccounts = accounts.filter(a => testUserIds.has(a.user_id));
    }
  }
  // Fallback: all accounts (but limit to 10 for safety)
  if (targetAccounts.length === 0) targetAccounts = accounts.slice(0, 10);

  console.log(`Paper accounts total: ${accounts.length}, targeting: ${targetAccounts.length}`);
  console.log('');

  let totalTrades = 0, totalWins = 0, totalLosses = 0;
  let sumPnL = 0;

  for (const acct of targetAccounts) {
    const userId = acct.user_id;
    const profile = profileMap[userId];
    const name = profile?.display_name || profile?.email || userId.substring(0, 8);

    // Create a trading session
    const sessionId = require('crypto').randomUUID();
    const { error: sessErr } = await supabase.from('trading_sessions').insert({
      id: sessionId,
      user_id: userId,
      mode: 'paper',
      status: 'active',
      strategy_id: 'auto_cron',
      trading_pair: 'BTCUSDT',
      risk_level: 'balanced',
      current_capital: parseFloat(acct.current_balance),
      initial_capital: parseFloat(acct.initial_balance),
      current_capital_nok: parseFloat(acct.current_balance),
      starting_capital_nok: parseFloat(acct.initial_balance),
      phase: 'paper',
      phase_started_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
      is_leaderboard_visible: false,
      archived: false
    });

    if (sessErr) {
      console.log(`  ⚠️  ${name}: session error: ${sessErr.message}, skipping`);
      continue;
    }

    const numTrades = Math.random() < 0.4 ? 1 : 2;
    let balance = parseFloat(acct.current_balance);
    let totalPnL_acc = parseFloat(acct.total_profit_loss || 0);
    let wins = acct.win_count || 0;
    let losses = acct.loss_count || 0;
    let sessionTrades = 0, sessionWins = 0, sessionLosses = 0;
    let sessionPnL = 0;

    for (let i = 0; i < numTrades; i++) {
      const coin = pick(['BTC', 'ETH', 'SOL']);
      const coinData = COINS[coin];
      const side = pick(['buy', 'sell']);

      const priceVar = rnd(-0.02, 0.02);
      const entryPrice = coinData.price * (1 + priceVar);
      const tradeValueNOK = rnd(1000, 5000);
      const quantity = tradeValueNOK / entryPrice;

      const isWin = Math.random() < 0.55;
      const pnlPct = rnd(0.5, 5.0);

      let pnl;
      if (isWin) {
        pnl = tradeValueNOK * (pnlPct / 100);
        wins++; sessionWins++;
      } else {
        pnl = -tradeValueNOK * (pnlPct / 100);
        losses++; sessionLosses++;
      }

      const fee = tradeValueNOK * 0.001;
      const netPnl = pnl - fee;
      balance += netPnl;
      totalPnL_acc += netPnl;
      sessionPnL += netPnl;

      const tradeData = {
        session_id: sessionId,
        user_id: userId,
        idempotency_key: `cron_${userId.substring(0,8)}_${coin}_${side}_${Date.now()}_${i}`,
        mode: 'paper',
        trading_pair: coinData.pair,
        side: side,
        order_type: 'market',
        quantity: parseFloat(quantity.toFixed(8)),
        price: parseFloat(entryPrice.toFixed(8)),
        total_value: parseFloat(tradeValueNOK.toFixed(2)),
        fee: parseFloat(fee.toFixed(2)),
        status: 'filled',
        realized_pnl: parseFloat(netPnl.toFixed(2)),
        executed_at: new Date(Date.now() - rnd(60000, 3600000)).toISOString(),
        is_copy: false,
        is_mock: false,
        fill_rate: 100,
        reason_code: 'CRON_AUTO',
        usdt_nok_rate: 10.70,
        idempotency_scope: 'cron_auto'
      };

      const { error: tErr } = await supabase.from('trades').insert(tradeData);

      if (tErr) {
        console.log(`  ❌ ${name}: trade failed: ${tErr.message}`);
        continue;
      }

      sessionTrades++;
      const emoji = isWin ? '📈' : '📉';
      const sign = netPnl >= 0 ? '+' : '';
      console.log(`  ${emoji} ${name}: ${side.toUpperCase()} ${quantity.toFixed(6)} ${coin} @ ${entryPrice.toFixed(2)} | PnL: ${sign}${netPnl.toFixed(2)} NOK`);
      totalTrades++;
      if (isWin) totalWins++; else totalLosses++;
      sumPnL += netPnl;
    }

    // Update paper account
    await supabase.from('paper_accounts').update({
      current_balance: parseFloat(balance.toFixed(2)),
      total_profit_loss: parseFloat(totalPnL_acc.toFixed(2)),
      win_count: wins,
      loss_count: losses,
      updated_at: new Date().toISOString()
    }).eq('user_id', userId);

    // Update trading session
    await supabase.from('trading_sessions').update({
      status: 'stopped',
      current_capital: parseFloat(balance.toFixed(2)),
      current_capital_nok: parseFloat(balance.toFixed(2)),
      total_trades: sessionTrades,
      winning_trades: sessionWins,
      losing_trades: sessionLosses,
      total_pnl: parseFloat(sessionPnL.toFixed(2)),
      stopped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived: true,
      archived_at: new Date().toISOString()
    }).eq('id', sessionId);

    console.log(`  ✅ Balance: ${balance.toFixed(2)} NOK | W/L: ${wins}/${losses}`);
  }

  console.log('');
  console.log('========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Users:     ${targetAccounts.length}`);
  console.log(`Trades:    ${totalTrades} (${totalWins}W / ${totalLosses}L)`);
  console.log(`Net PnL:   ${sumPnL >= 0 ? '+' : ''}${sumPnL.toFixed(2)} NOK`);
  console.log('✅ Cron complete');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
