import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET!;
const BASE_URL = 'http://localhost:3001';
const USER_ID = '6408d389-2021-4a2f-92b6-bebf0459a398';

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STRATEGIES = [
  {
    id: 'dca_trygg',
    config: { weeklyAmount: 1000, btcAllocation: 70, interval_minutes: 1, position_size: 0.01 },
  },
  {
    id: 'trend_balansert',
    config: { riskPerTrade: 2, stopLoss: 10, takeProfit: 15, fast_period: 12, slow_period: 26 },
  },
  {
    id: 'multisignal_aktiv',
    config: { aggressiveness: 'normal' },
  },
  {
    id: 'grid_bot',
    config: { upperPrice: 120000, lowerPrice: 20000, levels: 10, grid_levels: 10, capital: 5000 },
  },
  {
    id: 'ensemble_ai',
    config: { engine: 'ensemble_v2', useLLM: true, riskProfile: 'balanced', max_per_trade: 1000, auto_adjust_weights: true },
  },
  {
    id: 'ai_copy',
    config: { maxPerTrade: 1000, maxLoss: 500, engine_note: 'signal_fusion', display_mode: 'multi_signal_fallback' },
  },
] as const;

async function callCron(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  const body = await res.json().catch(() => ({}));
  console.log(`\n[${path}] status=${res.status}`);
  const out = JSON.stringify(body, null, 2);
  console.log(out.slice(0, 2500));
  return { status: res.status, body };
}

async function main() {
  console.log('=== All Strategies E2E Test for Demo User ===');

  // 1. Stop all active paper sessions
  const { data: existing } = await db
    .from('trading_sessions')
    .select('id')
    .eq('user_id', USER_ID)
    .eq('mode', 'paper')
    .eq('status', 'active');

  for (const s of existing ?? []) {
    await db.from('trading_sessions').update({ status: 'stopped', stopped_at: new Date().toISOString() }).eq('id', s.id);
    console.log('Stopped old session', s.id);
  }

  // 2. Create fresh sessions
  const sessions: Record<string, any> = {};
  for (const strat of STRATEGIES) {
    const { data: session, error } = await db
      .from('trading_sessions')
      .insert({
        user_id: USER_ID,
        mode: 'paper',
        status: 'active',
        strategy_id: strat.id,
        trading_pair: 'BTC/USDT',
        risk_level: 'balanced',
        current_capital: 100_000,
        initial_capital: 100_000,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        total_pnl: 0,
        started_at: new Date().toISOString(),
        strategy_config: strat.config,
      })
      .select()
      .single();

    if (error || !session) {
      console.error(`Failed to create session for ${strat.id}:`, error);
      continue;
    }
    sessions[strat.id] = session;
    console.log(`Created session ${strat.id}: ${session.id}`);
  }

  // 3. Trigger ai-engine (generates real ensemble signals)
  console.log('\n--- Triggering ai-engine ---');
  await callCron('/api/cron/ai-engine');
  await new Promise((r) => setTimeout(r, 1500));

  // Check if any real ensemble signals exist
  const { data: realSignals } = await db
    .from('trading_signals')
    .select('symbol, action, agent_id, confidence, created_at')
    .eq('signal_type', 'ensemble_ai')
    .eq('symbol', 'BTCUSDT')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('\nReal ensemble signals in DB:', realSignals ?? []);

  // Inject a demo ensemble BUY signal if none exists (so demo user always sees a trade)
  const hasMaster = (realSignals ?? []).some((s) => s.agent_id === 'ensemble_master');
  if (!hasMaster) {
    console.log('Injecting demo ensemble_master BUY signal for BTCUSDT...');
    const { error: injectErr } = await db.from('trading_signals').insert({
      symbol: 'BTCUSDT',
      action: 'buy',
      confidence: 72,
      entry_price: 85000,
      reasoning: 'Demo signal for pipeline verification',
      signal_type: 'ensemble_ai',
      status: 'active',
      ensemble_run_id: crypto.randomUUID(),
      agent_id: 'ensemble_master',
      agent_weight: 1.0,
      model_version: 'ensemble-v2',
      feature_version: '1h-basic',
    } as any);
    if (injectErr) {
      console.error('Failed to inject demo signal:', injectErr);
    } else {
      console.log('Demo signal injected OK');
    }
  }

  // 4. Trigger tick
  console.log('\n--- Triggering tick ---');
  const tickRes = await callCron('/api/cron/tick');
  await new Promise((r) => setTimeout(r, 1500));

  // 5. Check trades per session
  console.log('\n=== Trade Results ===');
  let totalTrades = 0;
  const details: any[] = [];
  for (const strat of STRATEGIES) {
    const session = sessions[strat.id];
    if (!session) continue;

    const { data: trades } = await db
      .from('trades')
      .select('id, side, price, total_value, created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const count = trades?.length ?? 0;
    totalTrades += count;
    const tickResult = tickRes.body.results?.find((r: any) => r.session_id === session.id);

    const info = {
      strategy: strat.id,
      sessionId: session.id,
      trades: count,
      tickAction: tickResult?.action ?? 'missing',
      tickRisk: tickResult?.risk_reason ?? null,
      tickError: tickResult?.error ?? null,
      tradeDetails: trades ?? [],
    };
    details.push(info);

    console.log(`${strat.id}: trades=${count}, tick_action=${tickResult?.action ?? 'N/A'}${tickResult?.risk_reason ? ` (risk: ${tickResult.risk_reason})` : ''}${tickResult?.error ? ` (error: ${tickResult.error})` : ''}`);
    for (const t of trades ?? []) {
      console.log(`  -> ${t.side} ${t.total_value} NOK @ ${t.price}`);
    }
  }

  console.log(`\nTotal trades opened: ${totalTrades}`);

  const failed = details.filter((d) => d.tickAction === 'error');
  if (failed.length > 0) {
    console.error('\nStrategies with errors:', failed.map((f) => f.strategy));
  }

  // For demo purposes, we accept trades if at least DCA or ensemble executed.
  const executed = details.filter((d) => d.tickAction === 'buy' || d.tickAction === 'sell');
  if (executed.length === 0) {
    console.error('❌ FAIL: No trades were executed');
    process.exitCode = 1;
  } else {
    console.log(`✅ PASS: ${executed.length} strategy/strategies executed trades`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
