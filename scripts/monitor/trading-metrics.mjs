#!/usr/bin/env node
/**
 * Trading Overhaul 48h Monitoring Script
 * Run: node scripts/monitor/trading-metrics.mjs [hours] [--save=file.json]
 *
 * Captures trading metrics for 48h observation period.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://vuxbjlykgmzskxbclquf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eGJqbHlrZ216c2t4YmNscXVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY3MDkxNCwiZXhwIjoyMDg2MjQ2OTE0fQ.xgqK_imYc7rkezSt6tUJvcEOm61AQ0x9de-ZDAX6fys';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const HOURS = process.argv[2] ? parseInt(process.argv[2]) : 24;
const SAVE_ARG = process.argv.find(a => a.startsWith('--save='));
const SAVE_PATH = SAVE_ARG ? SAVE_ARG.replace('--save=', '') : null;

console.log('═══════════════════════════════════════════════════════════════');
console.log(`  📊 KLARPAKKE TRADING METRICS — Last ${HOURS} hours`);
console.log(`  Timestamp: ${new Date().toISOString()}`);
console.log('═══════════════════════════════════════════════════════════════\n');

async function fetchMetrics() {
  const since = new Date(Date.now() - HOURS * 60 * 60 * 1000).toISOString();

  // 1. Session stats per strategy
  const { data: sessionStats, error: ssError } = await supabase
    .from('trades')
    .select(`
      session_id,
      strategy_id:trading_sessions!inner(strategy_id),
      realized_pnl,
      created_at,
      strategy_signal
    `)
    .gte('created_at', since)
    .eq('status', 'filled')
    .not('realized_pnl', 'is', null);

  if (ssError) {
    console.error('Error fetching trades:', ssError.message);
    process.exit(1);
  }

  // Group by strategy_id
  const byStrategy = {};
  let totalTrades = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalPnl = 0;
  const pnls = [];
  let positionSizes = [];

  (sessionStats || []).forEach(t => {
    const sid = t.strategy_id?.strategy_id || 'unknown';
    if (!byStrategy[sid]) {
      byStrategy[sid] = { trades: 0, wins: 0, losses: 0, totalPnl: 0, pnls: [] };
    }
    byStrategy[sid].trades++;
    totalTrades++;
    const pnl = parseFloat(t.realized_pnl) || 0;
    byStrategy[sid].totalPnl += pnl;
    byStrategy[sid].pnls.push(pnl);
    totalPnl += pnl;
    pnls.push(pnl);

    if (pnl > 0) {
      byStrategy[sid].wins++;
      totalWins++;
    } else {
      byStrategy[sid].losses++;
      totalLosses++;
    }

    // Position size from strategy_signal
    if (t.strategy_signal?.position_size) {
      positionSizes.push(parseFloat(t.strategy_signal.position_size));
    }
  });

  const winRate = totalTrades > 0 ? totalWins / totalTrades : 0;
  const avgPnl = pnls.length > 0 ? totalPnl / pnls.length : 0;
  const pnlStdDev = pnls.length > 1
    ? Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - avgPnl, 2), 0) / (pnls.length - 1))
    : 0;
  const sharpe = pnlStdDev > 0 ? (avgPnl / pnlStdDev) * Math.sqrt(365) : 0;

  // 2. Portfolio drawdown
  const { data: sessions, error: sessError } = await supabase
    .from('trading_sessions')
    .select('initial_capital, current_capital, user_id')
    .in('status', ['active', 'stopped'])
    .or('archived.is.null,archived.eq.false');

  if (sessError) {
    console.error('Error fetching sessions:', sessError.message);
  }

  const portfolioByUser = {};
  (sessions || []).forEach(s => {
    const uid = s.user_id;
    if (!portfolioByUser[uid]) portfolioByUser[uid] = { initial: 0, current: 0 };
    portfolioByUser[uid].initial += parseFloat(s.initial_capital) || 0;
    portfolioByUser[uid].current += parseFloat(s.current_capital) || 0;
  });

  let maxDd = 0;
  let avgDd = 0;
  const dds = [];
  Object.values(portfolioByUser).forEach(p => {
    if (p.initial > 0) {
      const dd = ((p.initial - p.current) / p.initial) * 100;
      dds.push(dd);
      if (dd > maxDd) maxDd = dd;
    }
  });
  avgDd = dds.length > 0 ? dds.reduce((a, b) => a + b, 0) / dds.length : 0;

  // 3. MTF block rate
  const { data: mtfLogs, error: mtfError } = await supabase
    .from('trading_logs')
    .select('details')
    .eq('action', 'regime_signal')
    .gte('created_at', since);

  let mtfTotal = 0;
  let mtfBlocked = 0;
  (mtfLogs || []).forEach(l => {
    mtfTotal++;
    if (l.details?.mtf_blocked === true || l.details?.mtf_blocked === 'true') {
      mtfBlocked++;
    }
  });
  const mtfBlockPct = mtfTotal > 0 ? (mtfBlocked / mtfTotal) * 100 : 0;

  // 4. P0 errors
  const { data: errors, error: errError } = await supabase
    .from('trading_logs')
    .select('id')
    .eq('action', 'error')
    .gte('created_at', since);

  const p0Errors = errors?.length || 0;

  // Build result
  const strategyBreakdown = Object.entries(byStrategy).map(([sid, s]) => ({
    strategy_id: sid,
    trades: s.trades,
    wins: s.wins,
    losses: s.losses,
    win_rate: s.trades > 0 ? s.wins / s.trades : 0,
    total_pnl: s.totalPnl,
  }));

  const result = {
    timestamp: new Date().toISOString(),
    period_hours: HOURS,
    win_rate: winRate,
    total_trades: totalTrades,
    total_wins: totalWins,
    total_losses: totalLosses,
    total_pnl: totalPnl,
    avg_drawdown_pct: avgDd,
    max_drawdown_pct: maxDd,
    sharpe_ratio: sharpe,
    mtf_block_pct: mtfBlockPct,
    mtf_total_checks: mtfTotal,
    mtf_blocked_count: mtfBlocked,
    avg_position_size_pct: positionSizes.length > 0
      ? (positionSizes.reduce((a, b) => a + b, 0) / positionSizes.length) * 100
      : 0,
    max_position_size_pct: positionSizes.length > 0
      ? Math.max(...positionSizes) * 100
      : 0,
    p0_errors: p0Errors,
    strategy_breakdown: strategyBreakdown,
  };

  // Print report
  console.log(`📈 WIN RATE:       ${(winRate * 100).toFixed(1)}% (${totalWins}W/${totalLosses}L / ${totalTrades}T)`);
  console.log(`📉 MAX DRAWDOWN:   ${maxDd.toFixed(2)}% (avg: ${avgDd.toFixed(2)}%)`);
  console.log(`⚡ SHARPE RATIO:   ${sharpe.toFixed(2)}`);
  console.log(`🚫 MTF BLOCK:      ${mtfBlockPct.toFixed(1)}% (${mtfBlocked}/${mtfTotal})`);
  console.log(`💰 AVG POSITION:   ${result.avg_position_size_pct.toFixed(2)}% (max: ${result.max_position_size_pct.toFixed(2)}%)`);
  console.log(`🔴 P0 ERRORS:      ${p0Errors}`);
  console.log(`📊 TOTAL P&L:      ${totalPnl.toFixed(2)} USDT`);
  console.log('');

  console.log('🎯 STRATEGY BREAKDOWN');
  console.log('───────────────────────────────────────────────────────────────');
  strategyBreakdown.forEach(s => {
    const icon = s.win_rate < 0.5 ? '🔴' : (s.win_rate < 0.55 ? '🟡' : '🟢');
    console.log(`  ${icon} ${s.strategy_id.slice(0, 8)}...: ${s.trades}T W${s.wins}L${s.losses} WR=${(s.win_rate*100).toFixed(0)}% P&L=${s.total_pnl.toFixed(2)}`);
  });

  // Threshold check
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  THRESHOLD CHECK');
  console.log('═══════════════════════════════════════════════════════════════');

  const checks = [
    { label: 'Win Rate > 55%', pass: winRate >= 0.55, value: `${(winRate*100).toFixed(1)}%`, critical: true },
    { label: 'Max DD < 6%', pass: maxDd < 6, value: `${maxDd.toFixed(2)}%`, critical: true },
    { label: 'Sharpe > 1.5', pass: sharpe >= 1.5, value: sharpe.toFixed(2), critical: true },
    { label: 'MTF Block 20-40%', pass: mtfBlockPct >= 20 && mtfBlockPct <= 40, value: `${mtfBlockPct.toFixed(1)}%`, critical: false },
    { label: 'Avg Pos < 2.5%', pass: result.avg_position_size_pct < 2.5, value: `${result.avg_position_size_pct.toFixed(2)}%`, critical: false },
    { label: 'P0 Errors = 0', pass: p0Errors === 0, value: `${p0Errors}`, critical: true },
  ];

  let allPass = true;
  checks.forEach(c => {
    const icon = c.pass ? '✅' : (c.critical ? '🔴' : '⚠️');
    console.log(`  ${icon} ${c.label.padEnd(20)} ${c.value}`);
    if (!c.pass && c.critical) allPass = false;
  });

  console.log('\n' + (allPass
    ? '🎉 ALL CRITICAL GATES PASSED'
    : '🔴 CRITICAL GATES FAILED — REVIEW REQUIRED'));

  // Save
  if (SAVE_PATH) {
    const fullPath = resolve(SAVE_PATH);
    writeFileSync(fullPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Saved to ${fullPath}`);
  }

  return result;
}

fetchMetrics().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
