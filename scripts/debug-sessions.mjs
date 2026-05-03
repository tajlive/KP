#!/usr/bin/env node
/**
 * Debug: Check why sell signals don't happen
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vuxbjlykgmzskxbclquf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eGJqbHlrZ216c2t4YmNscXVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY3MDkxNCwiZXhwIjoyMDg2MjQ2OTE0fQ.xgqK_imYc7rkezSt6tUJvcEOm61AQ0x9de-ZDAX6fys';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  const userId = '6408d389-2021-4a2f-92b6-bebf0459a398';

  console.log('🔍 Debugging sessions for', userId);

  // Get sessions with their trades
  const { data: sessions } = await supabase
    .from('trading_sessions')
    .select('id, strategy_id, trading_pair, current_capital, open_position, status, mode, created_at, last_tick_at')
    .eq('user_id', userId)
    .eq('mode', 'paper')
    .order('created_at', { ascending: false })
    .limit(20);

  console.log('\n📊 Sessions:', sessions?.length || 0);
  for (const s of (sessions || [])) {
    const { data: trades } = await supabase
      .from('trades')
      .select('side, price, quantity, executed_at, realized_pnl')
      .eq('session_id', s.id)
      .order('executed_at', { ascending: true });

    const buys = (trades || []).filter(t => t.side === 'buy');
    const sells = (trades || []).filter(t => t.side === 'sell');
    const lastTick = s.last_tick_at ? new Date(s.last_tick_at).toISOString().slice(0, 16) : 'never';
    const hasPosition = s.open_position ? 'YES' : 'NO';

    console.log(`\n  ${s.id.slice(0,8)} | ${s.strategy_id} | ${s.trading_pair} | ${s.status}`);
    console.log(`    Capital: ${s.current_capital} | Position: ${hasPosition} | Last tick: ${lastTick}`);
    console.log(`    Trades: ${buys.length} buys, ${sells.length} sells`);
    if (s.open_position) {
      console.log(`    Pos: ${s.open_position.quantity} @ ${s.open_position.entry_price} (highest: ${s.open_position.highest_price || 'N/A'})`);
    }
  }

  // Check trading_logs for blocked sells
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: logs } = await supabase
    .from('trading_logs')
    .select('session_id, action, details, created_at')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(50);

  console.log('\n\n📋 Trading Logs (last 30 days):', logs?.length || 0);
  const blocked = (logs || []).filter(l => l.action === 'risk_blocked');
  const liveFailed = (logs || []).filter(l => l.action === 'live_trade_failed');
  console.log(`  Risk blocked: ${blocked.length}`);
  console.log(`  Live failed: ${liveFailed.length}`);

  for (const l of (logs || []).slice(0, 10)) {
    console.log(`  ${l.created_at.slice(0,16)} | ${l.action} | ${JSON.stringify(l.details).slice(0,80)}`);
  }
}

run().catch(console.error);
