/**
 * KLA-137 Post-Deployment Monitoring Script
 * Run with: node scripts/kla137-monitoring.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vuxbjlykgmzskxbclquf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eGJqbHlrZ216c2t4YmNscXVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY3MDkxNCwiZXhwIjoyMDg2MjQ2OTE0fQ.xgqK_imYc7rkezSt6tUJvcEOm61AQ0x9de-ZDAX6fys'
);

const HOURS = process.argv[2] ? parseInt(process.argv[2]) : 6;

console.log('========================================');
console.log(`KLA-137 MONITORING REPORT — Last ${HOURS} hours`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('========================================\n');

// Check 1: Rejection Rate Analysis
async function checkRejectionRate() {
  console.log('=== CHECK 1: Rejection Rate Analysis ===\n');

  const since = new Date(Date.now() - HOURS * 60 * 60 * 1000).toISOString();

  const { data: rejections } = await supabase
    .from('trade_rejections')
    .select('rejection_reason')
    .gte('created_at', since);

  const { data: trades } = await supabase
    .from('trades')
    .select('id')
    .gte('created_at', since);

  const totalTrades = trades?.length || 0;
  const totalRejections = rejections?.length || 0;
  const totalAttempts = totalTrades + totalRejections;

  const rejectionRate = totalAttempts > 0
    ? ((totalRejections / totalAttempts) * 100).toFixed(1)
    : 0;

  console.log(`Total trade attempts: ${totalAttempts}`);
  console.log(`Successful trades: ${totalTrades}`);
  console.log(`Rejections: ${totalRejections}`);
  console.log(`Rejection rate: ${rejectionRate}%`);

  if (rejections && rejections.length > 0) {
    const breakdown = {};
    rejections.forEach(r => {
      breakdown[r.rejection_reason] = (breakdown[r.rejection_reason] || 0) + 1;
    });

    console.log('\nRejection breakdown:');
    Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .forEach(([reason, count]) => {
        const pct = ((count / totalRejections) * 100).toFixed(1);
        console.log(`  ${reason}: ${count} (${pct}%)`);
      });
  }

  const status = rejectionRate < 20 ? '✅ HEALTHY' : (rejectionRate < 40 ? '⚠️ WARNING' : '🔴 CRITICAL');
  console.log(`\nStatus: ${status}`);

  return { rejectionRate: parseFloat(rejectionRate), totalRejections, totalTrades };
}

// Check 2: RPC Health
async function checkRPCHealth() {
  console.log('\n=== CHECK 2: RPC Health ===\n');

  const since = new Date(Date.now() - HOURS * 60 * 60 * 1000).toISOString();

  const { data: decisions } = await supabase
    .from('trade_decisions')
    .select('rejection_reason')
    .gte('created_at', since);

  const total = decisions?.length || 0;
  const rpcFailures = decisions?.filter(d => d.rejection_reason === 'DAILY_LOSS_CHECK_FAILED').length || 0;

  console.log(`Total trade decisions: ${total}`);
  console.log(`RPC failures (DAILY_LOSS_CHECK_FAILED): ${rpcFailures}`);

  const status = rpcFailures === 0 ? '✅ HEALTHY' : '🔴 CRITICAL';
  console.log(`Status: ${status}`);

  // Test RPC function directly
  const { data: rpcTest, error: rpcError } = await supabase.rpc('calculate_daily_loss', {
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_session_id: '00000000-0000-0000-0000-000000000000'
  });

  if (rpcError) {
    console.log(`\nRPC function test: ❌ ERROR - ${rpcError.message}`);
  } else {
    console.log(`\nRPC function test: ✅ Working (returned: ${rpcTest})`);
  }

  return { rpcFailures, total };
}

// Check 3: Risk Profile Coverage
async function checkRiskProfileCoverage() {
  console.log('\n=== CHECK 3: Risk Profile Coverage ===\n');

  const { count: totalUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true });

  const { data: activeProfiles } = await supabase
    .from('risk_profiles')
    .select('user_id')
    .eq('is_active', true);

  const uniqueUsersWithProfile = new Set(activeProfiles?.map(p => p.user_id)).size;

  const coverage = totalUsers > 0
    ? ((uniqueUsersWithProfile / totalUsers) * 100).toFixed(1)
    : 0;

  console.log(`Total users: ${totalUsers}`);
  console.log(`Users with active risk profile: ${uniqueUsersWithProfile}`);
  console.log(`Coverage: ${coverage}%`);

  const status = coverage >= 60 ? '✅ HEALTHY' : (coverage >= 50 ? '⚠️ WARNING' : '🔴 LOW');
  console.log(`Status: ${status}`);

  return { coverage: parseFloat(coverage), totalUsers, usersWithProfile: uniqueUsersWithProfile };
}

// Check 4: Trade Volume
async function checkTradeVolume() {
  console.log('\n=== CHECK 4: Trade Volume ===\n');

  const since6h = new Date(Date.now() - HOURS * 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: paperTrades6h } = await supabase
    .from('trades')
    .select('id')
    .eq('mode', 'paper')
    .gte('created_at', since6h);

  const { data: paperTrades24h } = await supabase
    .from('trades')
    .select('id')
    .eq('mode', 'paper')
    .gte('created_at', since24h);

  const { data: liveTrades6h } = await supabase
    .from('trades')
    .select('id')
    .eq('mode', 'live')
    .gte('created_at', since6h);

  const { data: liveTrades24h } = await supabase
    .from('trades')
    .select('id')
    .eq('mode', 'live')
    .gte('created_at', since24h);

  const { data: rejections6h } = await supabase
    .from('trade_rejections')
    .select('id')
    .gte('created_at', since6h);

  const { data: rejections24h } = await supabase
    .from('trade_rejections')
    .select('id')
    .gte('created_at', since24h);

  console.log('| Category | Last 6h | Last 24h |');
  console.log('|----------|---------|----------|');
  console.log(`| Paper Trades | ${paperTrades6h?.length || 0} | ${paperTrades24h?.length || 0} |`);
  console.log(`| Live Trades | ${liveTrades6h?.length || 0} | ${liveTrades24h?.length || 0} |`);
  console.log(`| Rejections | ${rejections6h?.length || 0} | ${rejections24h?.length || 0} |`);

  return {
    paper6h: paperTrades6h?.length || 0,
    paper24h: paperTrades24h?.length || 0,
    live6h: liveTrades6h?.length || 0,
    live24h: liveTrades24h?.length || 0,
    rejections6h: rejections6h?.length || 0,
    rejections24h: rejections24h?.length || 0
  };
}

// Summary
async function printSummary(results) {
  console.log('\n========================================');
  console.log('MONITORING SUMMARY');
  console.log('========================================\n');

  console.log('| Metric | Value | Target | Status |');
  console.log('|--------|-------|--------|--------|');
  console.log(`| Rejection Rate | ${results.rejection.rejectionRate}% | < 20% | ${results.rejection.rejectionRate < 20 ? '✅' : (results.rejection.rejectionRate < 40 ? '⚠️' : '🔴')} |`);
  console.log(`| RPC Failures | ${results.rpc.rpcFailures} | 0 | ${results.rpc.rpcFailures === 0 ? '✅' : '🔴'} |`);
  console.log(`| Risk Profile Coverage | ${results.coverage.coverage}% | > 60% | ${results.coverage.coverage >= 60 ? '✅' : '⚠️'} |`);
  console.log(`| Paper Trades (6h) | ${results.volume.paper6h} | Growing | ${results.volume.paper6h > 0 ? '✅' : '⚠️'} |`);
  console.log(`| Live Trades (6h) | ${results.volume.live6h} | Growing | ✅ |`);

  const allHealthy =
    results.rejection.rejectionRate < 20 &&
    results.rpc.rpcFailures === 0 &&
    results.coverage.coverage >= 50;

  console.log('\n========================================');
  if (allHealthy) {
    console.log('OVERALL STATUS: ✅ HEALTHY');
    console.log('RECOMMENDATION: 🟢 GO for KLA-129');
  } else if (results.rpc.rpcFailures > 0) {
    console.log('OVERALL STATUS: 🔴 CRITICAL ISSUES');
    console.log('RECOMMENDATION: 🔴 NO-GO — Fix RPC failures first');
  } else {
    console.log('OVERALL STATUS: ⚠️ NEEDS ATTENTION');
    console.log('RECOMMENDATION: 🟡 GO WITH CONDITIONS');
  }
  console.log('========================================');
}

// Run all checks
async function runMonitoring() {
  const results = {};

  results.rejection = await checkRejectionRate();
  results.rpc = await checkRPCHealth();
  results.coverage = await checkRiskProfileCoverage();
  results.volume = await checkTradeVolume();

  await printSummary(results);
}

runMonitoring().catch(console.error);
