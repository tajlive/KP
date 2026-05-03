#!/usr/bin/env node
/**
 * Fetch actual paper trading data for tomarnejensen@gmail.com
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vuxbjlykgmzskxbclquf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eGJqbHlrZ216c2t4YmNscXVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY3MDkxNCwiZXhwIjoyMDg2MjQ2OTE0fQ.xgqK_imYc7rkezSt6tUJvcEOm61AQ0x9de-ZDAX6fys';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  console.log('🔍 Fetching paper trading data for tomarnejensen@gmail.com...\n');

  // 1. Get user ID
  const { data: userData, error: userError } = await supabase
    .from('user_profiles')
    .select('id, email, tier, paper_balance, live_phase, binance_connected')
    .eq('email', 'tomarnejensen@gmail.com')
    .single();

  if (userError || !userData) {
    console.error('❌ User not found:', userError?.message);
    process.exit(1);
  }

  const userId = userData.id;
  console.log('👤 User:', userData.email);
  console.log('   Tier:', userData.tier);
  console.log('   Paper Balance:', userData.paper_balance);
  console.log('   Live Phase:', userData.live_phase);
  console.log('   Binance Connected:', userData.binance_connected);
  console.log('   User ID:', userId);

  // 2. Get active paper sessions
  const { data: sessions, error: sessError } = await supabase
    .from('trading_sessions')
    .select('id, strategy_id, trading_pair, current_capital_nok, initial_capital_nok, status, mode, created_at')
    .eq('user_id', userId)
    .eq('mode', 'paper')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (sessError) {
    console.error('❌ Session error:', sessError.message);
  }

  console.log('\n📊 Active Paper Sessions:', sessions?.length ?? 0);
  for (const s of (sessions || [])) {
    console.log(`   • ${s.strategy_id} | ${s.trading_pair} | ${s.current_capital_nok} NOK | ${s.status}`);
  }

  // 3. Get trades from last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: trades, error: tradeError } = await supabase
    .from('trades')
    .select('id, session_id, trading_pair, side, price, quantity, total_value, fee, realized_pnl, mode, executed_at, reason_code')
    .eq('user_id', userId)
    .eq('mode', 'paper')
    .gte('executed_at', thirtyDaysAgo)
    .order('executed_at', { ascending: true });

  if (tradeError) {
    console.error('❌ Trade error:', tradeError.message);
  }

  console.log('\n💰 Paper Trades (last 30 days):', trades?.length ?? 0);

  // Group by session
  const bySession = {};
  for (const t of (trades || [])) {
    if (!bySession[t.session_id]) bySession[t.session_id] = [];
    bySession[t.session_id].push(t);
  }

  for (const [sessId, sessTrades] of Object.entries(bySession)) {
    const pair = sessTrades[0].trading_pair;
    const buyTrades = sessTrades.filter(t => t.side === 'buy');
    const sellTrades = sessTrades.filter(t => t.side === 'sell');
    const totalPnl = sessTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
    const totalFees = sessTrades.reduce((sum, t) => sum + (t.fee || 0), 0);

    console.log(`\n   ${pair} (${sessTrades.length} trades):`);
    console.log(`      Buys: ${buyTrades.length} | Sells: ${sellTrades.length}`);
    console.log(`      Realized P&L: ${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} NOK`);
    console.log(`      Total Fees: ${totalFees.toFixed(2)} NOK`);
    console.log(`      Net: ${(totalPnl - totalFees) >= 0 ? '+' : ''}${(totalPnl - totalFees).toFixed(2)} NOK`);
  }

  // 4. Overall P&L
  const totalPnl = (trades || []).reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  const totalFees = (trades || []).reduce((sum, t) => sum + (t.fee || 0), 0);
  const netPnl = totalPnl - totalFees;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  30-DAY PAPER TRADING SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Total Trades:      ${trades?.length ?? 0}`);
  console.log(`  Gross P&L:         ${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} NOK`);
  console.log(`  Total Fees:        ${totalFees.toFixed(2)} NOK`);
  console.log(`  Net P&L:           ${netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)} NOK`);
  console.log(`  Win Rate:          ${trades?.length ? ((trades.filter(t => (t.realized_pnl || 0) > 0).length / trades.length) * 100).toFixed(1) : 0}%`);
  console.log('═══════════════════════════════════════════════════════════════');

  // Save data
  const fs = await import('fs');
  const output = {
    user: { id: userId, email: userData.email, tier: userData.tier, paper_balance: userData.paper_balance },
    sessions: sessions || [],
    trades: trades || [],
    summary: { totalTrades: trades?.length ?? 0, grossPnl: totalPnl, totalFees, netPnl },
    fetchedAt: new Date().toISOString(),
  };
  fs.writeFileSync('./paper-actual-30day.json', JSON.stringify(output, null, 2));
  console.log('\n💾 Data saved to ./paper-actual-30day.json');
}

run().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
