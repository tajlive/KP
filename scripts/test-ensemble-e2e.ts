/**
 * Manual E2E test: ai-engine -> tick -> trade execution for ensemble_ai
 * Usage: npx tsx scripts/test-ensemble-e2e.ts
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET!;
const BASE_URL = 'https://www.klarpakke.no';
const USER_ID = '6408d389-2021-4a2f-92b6-bebf0459a398';

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function callCron(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  const body = await res.json().catch(() => ({}));
  console.log(`[${path}] status=${res.status}`, JSON.stringify(body, null, 2).slice(0, 800));
  return { status: res.status, body };
}

async function main() {
  console.log('=== Ensemble AI E2E Test ===');

  // 1. Clean up previous test sessions for this user/paper
  const { data: existingSessions } = await db
    .from('trading_sessions')
    .select('id')
    .eq('user_id', USER_ID)
    .eq('mode', 'paper')
    .eq('status', 'active');

  for (const s of existingSessions ?? []) {
    console.log('Stopping old session', s.id);
    await db
      .from('trading_sessions')
      .update({ status: 'stopped', stopped_at: new Date().toISOString() })
      .eq('id', s.id);
  }

  // 2. Create fresh ensemble_ai paper session
  const { data: session, error: sessionErr } = await db
    .from('trading_sessions')
    .insert({
      user_id: USER_ID,
      mode: 'paper',
      status: 'active',
      strategy_id: 'ensemble_ai',
      trading_pair: 'BTC/USDT',
      risk_level: 'balanced',
      current_capital: 100_000,
      initial_capital: 100_000,
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      total_pnl: 0,
      started_at: new Date().toISOString(),
      strategy_config: {
        engine: 'ensemble_v2',
        useLLM: true,
        riskProfile: 'balanced',
        max_per_trade: 1000,
        auto_adjust_weights: true,
      },
    })
    .select()
    .single();

  if (sessionErr || !session) {
    console.error('Failed to create session:', sessionErr);
    process.exit(1);
  }
  console.log('Created session', session.id);

  // 3. Trigger ai-engine cron
  console.log('\n--- Triggering ai-engine ---');
  const aiRes = await callCron('/api/cron/ai-engine');

  // 4. Verify signals exist
  await new Promise((r) => setTimeout(r, 2000));
  const { data: signals } = await db
    .from('trading_signals')
    .select('*')
    .eq('signal_type', 'ensemble_ai')
    .eq('symbol', 'BTCUSDT')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`Found ${signals?.length ?? 0} ensemble signals for BTCUSDT`);
  const master = signals?.find((s) => s.agent_id === 'ensemble_master');
  if (master) {
    console.log('Master signal:', {
      action: master.action,
      confidence: master.confidence,
      created_at: master.created_at,
    });
  } else {
    console.warn('No master signal found!');
  }

  // 5. Trigger tick cron
  console.log('\n--- Triggering tick ---');
  const tickRes = await callCron('/api/cron/tick');

  // 6. Look for trade
  await new Promise((r) => setTimeout(r, 1500));
  const { data: trades } = await db
    .from('trades')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`\nTrades created for session: ${trades?.length ?? 0}`);
  for (const t of trades ?? []) {
    console.log('Trade:', {
      id: t.id,
      side: t.side,
      trading_pair: t.trading_pair,
      price: t.price,
      total_value: t.total_value,
      created_at: t.created_at,
    });
  }

  // 7. Summary
  const sessionResult = tickRes.body.results?.find(
    (r: any) => r.session_id === session.id
  );
  console.log('\n=== Summary ===');
  console.log('Session result from tick:', sessionResult ?? 'Not found in tick results');
  console.log('Trade count in DB:', trades?.length ?? 0);

  if ((trades?.length ?? 0) === 0) {
    console.error('\n❌ FAIL: No trade was opened');
    process.exitCode = 1;
  } else {
    console.log('\n✅ PASS: Trade was opened successfully');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
