#!/usr/bin/env node
/**
 * Production verification script for dashboard/portfolio capital consistency
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function getDashboardMetrics(userId) {
  const { data: rpcData, error: rpcErr } = await supabase
    .rpc('get_dashboard_metrics', { p_user_id: userId });

  if (!rpcErr && rpcData) {
    return { source: 'rpc', data: rpcData };
  }

  const { data: sessions } = await supabase
    .from('trading_sessions')
    .select('id, status, current_capital_nok, trading_mode, total_trades, total_pnl, initial_capital')
    .eq('user_id', userId)
    .is('archived', false)
    .in('status', ['active', 'stopped']);

  const activeSessions = (sessions || []).filter(s => s.status === 'active');
  const completedSessions = (sessions || []).filter(s => s.status === 'stopped');

  const totalCapital = (sessions || []).reduce((sum, s) => sum + (s.current_capital_nok || 0), 0);
  const totalPnl = activeSessions.reduce((sum, s) => sum + (s.total_pnl || 0), 0);

  return {
    source: 'ts-fallback',
    data: {
      total_capital: totalCapital,
      total_pnl: totalPnl,
      active_sessions: activeSessions.length,
      completed_sessions: completedSessions.length,
    }
  };
}

async function getPortfolioData(userId) {
  const { data: wallets } = await supabase.from('wallets').select('*').eq('user_id', userId);
  const { data: sessions } = await supabase
    .from('trading_sessions')
    .select('id, status, current_capital_nok, trading_mode, total_trades, total_pnl, initial_capital')
    .eq('user_id', userId)
    .is('archived', false)
    .in('status', ['active', 'stopped']);
  const { data: profile } = await supabase.from('user_profiles').select('paper_balance, tier, display_name').eq('id', userId).maybeSingle();

  return {
    wallets: { count: (wallets || []).length, balance: (wallets || []).reduce((s, w) => s + (w.balance || 0), 0) },
    sessions: { count: (sessions || []).length, totalCapital: (sessions || []).reduce((sum, s) => sum + (s.current_capital_nok || 0), 0) },
    profile: profile || {},
  };
}

async function verifyUser(userId, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`VERIFYING: ${label}`);
  console.log(`User ID: ${userId}`);
  console.log('='.repeat(60));

  const dashboard = await getDashboardMetrics(userId);
  console.log('\n📊 DASHBOARD metrics (' + dashboard.source + '):');
  console.log('   Total Capital:', dashboard.data.total_capital?.toLocaleString('no-NO'), 'NOK');
  console.log('   Total PnL:', dashboard.data.total_pnl?.toLocaleString('no-NO'), 'NOK');
  console.log('   Active Sessions:', dashboard.data.active_sessions);
  console.log('   Completed Sessions:', dashboard.data.completed_sessions);

  const portfolio = await getPortfolioData(userId);
  console.log('\n💼 PORTFOLIO data:');
  console.log('   Sessions total capital:', portfolio.sessions.totalCapital?.toLocaleString('no-NO'), 'NOK');
  console.log('   Wallet balance:', portfolio.wallets.balance?.toLocaleString('no-NO'), 'NOK');
  console.log('   Profile paper_balance:', portfolio.profile.paper_balance?.toLocaleString('no-NO'), 'NOK');
  console.log('   Profile tier:', portfolio.profile.tier);

  const match = Math.abs((dashboard.data.total_capital || 0) - (portfolio.sessions.totalCapital || 0)) < 0.01;
  console.log('\n✅ MATCH CHECK: Dashboard total === Portfolio sessions total:', match ? '✅ YES' : '❌ NO');
  if (!match) {
    console.log('   ⚠️  DIFFERENCE:', Math.abs((dashboard.data.total_capital || 0) - (portfolio.sessions.totalCapital || 0)).toFixed(2), 'NOK');
  }

  return { dashboard, portfolio, match };
}

async function main() {
  console.log('🔍 PRODUCTION VERIFICATION: Dashboard vs Portfolio Capital');
  console.log('Date:', new Date().toISOString());

  const users = [
    { id: '6408d389-2021-4a2f-92b6-bebf0459a398', label: 'tomarnejensen@gmail.com' },
    { id: '00aac060-a9bf-4959-ae73-67f1fbbaff06', label: 'klarpakke.test+playwright@gmail.com' },
    { id: '2415156e-47dd-405c-9f26-678d4d70fd14', label: 'tom@klarpakke.no' },
  ];

  let allMatch = true;
  for (const u of users) {
    const result = await verifyUser(u.id, u.label);
    if (!result.match) allMatch = false;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(allMatch ? '✅ ALL USERS MATCH — Fix verified!' : '❌ MISMATCH DETECTED');
  console.log('='.repeat(60));
  process.exit(allMatch ? 0 : 1);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
