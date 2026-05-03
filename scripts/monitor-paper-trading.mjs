#!/usr/bin/env node
/**
 * Paper Trading Monitor — Daily P&L Report
 * Runs via cron or manually to check paper trading performance
 * 
 * Usage:
 *   npx tsx scripts/monitor-paper-trading.mjs           # Run once
 *   npx tsx scripts/monitor-paper-trading.mjs --watch   # Watch mode (every 5 min)
 *   npx tsx scripts/monitor-paper-trading.mjs --daily   # Daily summary
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://vuxbjlykgmzskxbclquf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eGJqbHlrZ216c2t4YmNscXVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY3MDkxNCwiZXhwIjoyMDg2MjQ2OTE0fQ.xgqK_imYc7rkezSt6tUJvcEOm61AQ0x9de-ZDAX6fys';

const USER_ID = '6408d389-2021-4a2f-92b6-bebf0459a398'; // tomarnejensen@gmail.com
const LOG_FILE = path.join(process.cwd(), 'paper-monitoring-log.jsonl');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  const isDaily = process.argv.includes('--daily');
  const isWatch = process.argv.includes('--watch');

  console.log(`📊 Paper Trading Monitor — ${new Date().toISOString().slice(0, 16)}\n`);

  // 1. Get user profile
  const { data: user } = await supabase
    .from('user_profiles')
    .select('paper_balance, tier, live_phase, binance_connected, risk_accepted_at')
    .eq('id', USER_ID)
    .single();

  if (!user) {
    console.error('❌ User not found');
    process.exit(1);
  }

  console.log('👤 User: tomarnejensen@gmail.com');
  console.log(`   Paper Balance: ${user.paper_balance?.toLocaleString()} NOK`);
  console.log(`   Live Phase: ${user.live_phase}`);
  console.log(`   Risk Accepted: ${user.risk_accepted_at ? '✅ ' + user.risk_accepted_at.slice(0, 10) : '❌ Ikke godtatt'}`);
  console.log();

  // 2. Get active sessions
  const { data: sessions } = await supabase
    .from('trading_sessions')
    .select('id, strategy_id, trading_pair, current_capital_nok, initial_capital_nok, status, mode, open_position, created_at')
    .eq('user_id', USER_ID)
    .eq('mode', 'paper');

  const active = (sessions || []).filter(s => s.status === 'active');
  const stopped = (sessions || []).filter(s => s.status === 'stopped');

  console.log(`📊 Sessions: ${sessions?.length || 0} total (${active.length} active, ${stopped.length} stopped)`);

  // 3. Get trades from last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: weekTrades } = await supabase
    .from('trades')
    .select('side, price, quantity, total_value, fee, realized_pnl, executed_at, trading_pair, reason_code')
    .eq('user_id', USER_ID)
    .eq('mode', 'paper')
    .gte('executed_at', sevenDaysAgo)
    .order('executed_at', { ascending: true });

  // 4. Calculate metrics
  const totalInitial = (sessions || []).reduce((sum, s) => sum + (s.initial_capital_nok || 0), 0);
  const totalCurrent = (sessions || []).reduce((sum, s) => sum + (s.current_capital_nok || 0), 0);
  const totalPnl = totalCurrent - totalInitial;
  const totalReturn = totalInitial > 0 ? (totalPnl / totalInitial) * 100 : 0;

  const weekBuys = (weekTrades || []).filter(t => t.side === 'buy');
  const weekSells = (weekTrades || []).filter(t => t.side === 'sell');
  const weekFees = (weekTrades || []).reduce((sum, t) => sum + (t.fee || 0), 0);
  const weekRealized = (weekTrades || []).reduce((sum, t) => sum + (t.realized_pnl || 0), 0);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  PORTFOLIO SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Total Initial Capital: ${totalInitial.toLocaleString()} NOK`);
  console.log(`  Total Current Capital: ${totalCurrent.toLocaleString()} NOK`);
  console.log(`  Total P&L:             ${totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString()} NOK`);
  console.log(`  Total Return:          ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`);
  console.log(`  7d Trades:             ${weekBuys.length} buys, ${weekSells.length} sells`);
  console.log(`  7d Realized P&L:       ${weekRealized >= 0 ? '+' : ''}${weekRealized.toFixed(2)} NOK`);
  console.log(`  7d Fees:               ${weekFees.toFixed(2)} NOK`);
  console.log(`  7d Net:                ${(weekRealized - weekFees) >= 0 ? '+' : ''}${(weekRealized - weekFees).toFixed(2)} NOK`);
  console.log('═══════════════════════════════════════════════════════════════');

  // 5. Per-session breakdown
  console.log('\n📈 Per-Session Breakdown:');
  for (const s of (sessions || []).slice(0, 10)) {
    const sPnl = (s.current_capital_nok || 0) - (s.initial_capital_nok || 0);
    const sReturn = s.initial_capital_nok > 0 ? (sPnl / s.initial_capital_nok) * 100 : 0;
    const hasPos = s.open_position ? '🔒' : '  ';
    console.log(`  ${hasPos} ${s.trading_pair.padEnd(10)} ${s.strategy_id.padEnd(12)} | ${s.status.padEnd(7)} | ${sReturn >= 0 ? '+' : ''}${sReturn.toFixed(2)}% | ${s.current_capital_nok?.toLocaleString()} NOK`);
  }

  // 6. Risk checks
  console.log('\n🛡️ Risk Checks:');
  if (totalReturn <= -5) {
    console.log('  ⚠️  PORTFOLIO DRAWDOWN ≥ 5% — All sessions should be STOPPED');
  } else {
    console.log('  ✅ Portfolio drawdown within limits');
  }

  const openPositions = (sessions || []).filter(s => s.open_position && s.status === 'active');
  console.log(`  📊 Open positions: ${openPositions.length}`);

  const stalePositions = openPositions.filter(s => {
    const lastTick = s.last_tick_at ? new Date(s.last_tick_at).getTime() : 0;
    return (Date.now() - lastTick) > 24 * 60 * 60 * 1000; // > 24h
  });
  if (stalePositions.length > 0) {
    console.log(`  ⚠️  ${stalePositions.length} positions with no tick > 24h`);
  }

  // 7. Go-live readiness
  console.log('\n🚀 Go-Live Readiness:');
  const checks = [
    { name: 'Paper profitable (30d)', pass: totalReturn > 5 },
    { name: 'Risk accepted', pass: !!user.risk_accepted_at },
    { name: 'Tier allows live', pass: ['bachelor', 'master', 'phd', 'professor'].includes(user.tier) },
    { name: 'Binance connected', pass: user.binance_connected },
    { name: 'Sell rate > 20%', pass: weekSells.length > 0 && weekBuys.length > 0 && (weekSells.length / weekBuys.length) > 0.2 },
  ];

  for (const c of checks) {
    console.log(`  ${c.pass ? '✅' : '❌'} ${c.name}`);
  }

  const readyCount = checks.filter(c => c.pass).length;
  console.log(`\n  Ready: ${readyCount}/${checks.length} checks passed`);
  if (readyCount === checks.length) {
    console.log('  🎉 ALL CHECKS PASSED — Ready for micro-live!');
  }

  // 8. Log to file
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId: USER_ID,
    totalInitial,
    totalCurrent,
    totalPnl,
    totalReturn,
    weekBuys: weekBuys.length,
    weekSells: weekSells.length,
    weekRealized,
    weekFees,
    activeSessions: active.length,
    stoppedSessions: stopped.length,
    openPositions: openPositions.length,
    readyCount,
  };
  fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');
  console.log(`\n💾 Logged to ${LOG_FILE}`);

  // 9. Watch mode
  if (isWatch) {
    console.log('\n👀 Watch mode active — checking again in 5 minutes...');
    setTimeout(run, 5 * 60 * 1000);
  }
}

run().catch(err => {
  console.error('❌ Monitor failed:', err);
  process.exit(1);
});
