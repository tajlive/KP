// ============================================================================
// supabase/functions/paper-trading-init/index.ts
// PAPER TRADING SESSION INITIALIZATION
// ============================================================================
// Auto-initialiserer paper trading for innlogget bruker.
// Idempotent: trygt å kalle flere ganger.
//
// Auth: Bearer token (Supabase JWT) → supabase.auth.getUser()
// DB: Service role key for å bypass RLS
// ============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PaperTradingSession {
  id: string;
  user_id: string;
  trading_pair: string;
  mode: 'paper' | 'live';
  strategy_id: string;
  status: 'active' | 'paused' | 'stopped';
  starting_capital_nok: number;
  current_capital_nok: number;
  started_at: string;
  stopped_at?: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_pnl: number;
  created_at?: string;
}

serve(async (req) => {
  try {
    // --- Auth: extract Bearer token ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify the user's JWT
    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const userId = user.id;

    // --- Get or create paper trading session ---
    const session = await getOrCreatePaperTradingSession(supabase, userId);

    // --- Response ---
    return new Response(
      JSON.stringify({
        success: true,
        session: {
          id: session.id,
          created_at: session.created_at,
          starting_capital_nok: session.starting_capital_nok,
          current_capital_nok: session.current_capital_nok,
          // Bakoverkompatibilitet for eldre e2e-tester
          starting_balance: session.starting_capital_nok,
          current_balance: session.current_capital_nok,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[paper-trading-init] Error:', (err as Error).message);
    return new Response(
      JSON.stringify({ error: 'Kunne ikke initialisere paper trading', code: 'INIT_FAILED' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});

/**
 * Get or create paper trading session (auto-initialization).
 * Rydder opp duplikate aktive paper-sessions for brukeren
 * og fikser manglende felter i gamle rader (soft migration).
 */
async function getOrCreatePaperTradingSession(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<PaperTradingSession> {
  // Hent ALLE aktive paper-sessions for brukeren
  const { data: allActive, error: fetchErr } = await supabase
    .from('trading_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', 'paper')
    .eq('status', 'active')
    .order('started_at', { ascending: false });

  if (fetchErr) {
    console.error('[paper-trading-init] getOrCreate fetch error:', fetchErr.message);
    throw new Error('Failed to fetch paper trading sessions');
  }

  // Ingen aktive: opprett ny
  if (!allActive || allActive.length === 0) {
    return createPaperTradingSession(supabase, userId);
  }

  // Multi-bot support: only stop true duplicates (same pair + same strategy).
  // Do NOT stop sessions with different pairs or strategies.
  const [newest] = allActive;

  // Group by (trading_pair, strategy_id) and keep only newest per group
  const seen = new Set<string>();
  const duplicateIds: string[] = [];
  for (const s of allActive) {
    const key = `${s.trading_pair}:${s.strategy_id}`;
    if (seen.has(key)) {
      duplicateIds.push(s.id);
    } else {
      seen.add(key);
    }
  }

  if (duplicateIds.length > 0) {
    const { error: stopErr } = await supabase
      .from('trading_sessions')
      .update({
        status: 'stopped',
        updated_at: new Date().toISOString(),
        archived: true,
        archived_at: new Date().toISOString(),
      })
      .in('id', duplicateIds);
    if (stopErr) {
      console.error('[paper-trading-init] getOrCreate dedup error:', stopErr.message);
    }
  }

  // Soft migration: fyll inn manglende felter på nyeste rad
  const s = newest as Record<string, unknown>;
  const needsUpdate: Record<string, unknown> = {};
  if (s.initial_capital == null) needsUpdate.initial_capital = (s.starting_capital_nok as number) ?? 100000;
  if (s.current_capital == null) needsUpdate.current_capital = (s.current_capital_nok as number) ?? 100000;
  if (s.total_pnl == null) needsUpdate.total_pnl = 0;
  if (s.total_trades == null) needsUpdate.total_trades = 0;
  if (s.winning_trades == null) needsUpdate.winning_trades = 0;
  if (s.losing_trades == null) needsUpdate.losing_trades = 0;
  if (s.strategy_config == null) needsUpdate.strategy_config = {};
  if (s.last_heartbeat == null) needsUpdate.last_heartbeat = new Date().toISOString();

  if (Object.keys(needsUpdate).length > 0) {
    needsUpdate.updated_at = new Date().toISOString();
    const { error: patchErr } = await supabase
      .from('trading_sessions')
      .update(needsUpdate)
      .eq('id', (newest as { id: string }).id);
    if (patchErr) {
      console.error('[paper-trading-init] getOrCreate soft-migration error:', patchErr.message);
    }
  }

  return newest as unknown as PaperTradingSession;
}

/**
 * Create a new paper trading session for a user
 */
async function createPaperTradingSession(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<PaperTradingSession> {
  // Respect user's auto-trading config if enabled.
  const strategyId = 'dca';
  let startingCapital = 100000;
  try {
    const { data: cfg } = await supabase
      .from('user_auto_trading_configs')
      .select('strategy_id, is_enabled, trading_capital_nok, risk_level')
      .eq('user_id', userId)
      .single();
    if (cfg?.is_enabled && cfg?.trading_capital_nok) {
      startingCapital = cfg.trading_capital_nok;
    }
  } catch {
    // ignore config fetch errors
  }

  const { data, error } = await supabase
    .from('trading_sessions')
    .insert({
      user_id: userId,
      trading_pair: 'BTCUSDT',
      mode: 'paper',
      strategy_id: strategyId,
      status: 'active',
      starting_capital_nok: startingCapital,
      current_capital_nok: startingCapital,
      started_at: new Date().toISOString(),
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      total_pnl: 0,
      strategy_config: {},
      last_heartbeat: new Date().toISOString(),
      initial_capital: startingCapital,
      current_capital: startingCapital,
    })
    .select()
    .single();

  if (error) {
    // Unique active-session conflict: return the existing active session instead.
    if (error.code === '23505') {
      const existing = await getPaperTradingSession(supabase, userId);
      if (existing) return existing;
    }
    console.error('[paper-trading-init] Failed to create paper trading session:', error);
    throw new Error('Failed to create paper trading session');
  }

  return data as unknown as PaperTradingSession;
}

/**
 * Get user's active paper trading session
 */
async function getPaperTradingSession(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<PaperTradingSession | null> {
  const { data, error } = await supabase
    .from('trading_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', 'paper')
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('[paper-trading-init] Failed to get paper trading session:', error);
    throw new Error('Failed to get paper trading session');
  }

  return data as unknown as PaperTradingSession;
}
