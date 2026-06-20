import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { captureCronError, captureCronSuccess } from '@/lib/cron/cron-helpers';
import type { Database } from '@/types/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { validateCronSecret } from "@/lib/auth/cron";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = (await createClient()) as SupabaseClient<Database>;
  const startTime = Date.now();

  try {
    // 1) Find signals older than 4 hours that do not yet have an outcome row.
    const { data: existingOutcomes } = await db
      .from('ai_signal_outcomes')
      .select('signal_id');

    const resolvedIds = new Set((existingOutcomes ?? []).map((o) => o.signal_id));

    const { data: candidateSignals } = await db
      .from('trading_signals')
      .select('id, symbol, action, created_at, agent_id, agent_meta')
      .eq('signal_type', 'ensemble_ai')
      .lt('created_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(500);

    const unresolvedRows = (candidateSignals ?? []).filter((r) => !resolvedIds.has(r.id));
    const symbols = Array.from(new Set(unresolvedRows.map((r) => r.symbol)));

    // Fetch latest known close per symbol from ai_feature_store
    const { data: latestFeatures } = await db
      .from('ai_feature_store')
      .select('symbol, features, as_of')
      .in('symbol', symbols)
      .order('as_of', { ascending: false });

    const latestPriceMap = new Map<string, number>();
    for (const row of latestFeatures ?? []) {
      const f = row.features as Record<string, unknown> | null;
      const price = typeof f?.close === 'number' ? f.close : null;
      if (price && !latestPriceMap.has(row.symbol)) latestPriceMap.set(row.symbol, price);
    }

    // Also try to get price from the signal itself if stored in meta
    for (const row of unresolvedRows) {
      if (latestPriceMap.has(row.symbol)) continue;
      const meta = (row as unknown as { agent_meta?: Record<string, unknown> | null }).agent_meta;
      const price = typeof meta?.price_at_signal === 'number' ? meta.price_at_signal : null;
      if (price) latestPriceMap.set(row.symbol, price);
    }

    const outcomeInserts: {
      signal_id: string;
      pnl: number;
    }[] = [];

    for (const row of unresolvedRows) {
      const evalPrice = latestPriceMap.get(row.symbol);
      if (!evalPrice) continue;
      const meta = (row as unknown as { agent_meta?: Record<string, unknown> | null }).agent_meta;
      const signalPrice = typeof meta?.price_at_signal === 'number' ? meta.price_at_signal : null;
      const entryPrice = signalPrice ?? evalPrice;

      let pnlPct = 0;
      if (row.action === 'buy') pnlPct = (evalPrice - entryPrice) / entryPrice;
      else if (row.action === 'sell') pnlPct = (entryPrice - evalPrice) / entryPrice;

      const outcome: 'win' | 'loss' | 'neutral' = pnlPct > 0.005 ? 'win' : pnlPct < -0.005 ? 'loss' : 'neutral';

      outcomeInserts.push({
        signal_id: row.id,
        pnl: pnlPct,
      });
    }

    if (outcomeInserts.length > 0) {
      const { error: outcomeErr } = await db.from('ai_signal_outcomes').insert(outcomeInserts);
      if (outcomeErr) throw new Error(`Failed inserting outcomes: ${outcomeErr.message}`);
    }

    // 2) Recompute ai_agent_stats from ai_signal_outcomes joined with trading_signals
    const { data: agentRows } = await db
      .from('ai_signal_outcomes')
      .select('outcome, pnl_pct, trading_signals!inner(agent_id, symbol)')
      .not('trading_signals.agent_id', 'is', null);

    const statsMap = new Map<
      string,
      { wins: number; losses: number; neutrals: number; totalPnL: number; count: number; symbol: string }
    >();

    for (const row of agentRows ?? []) {
      const r = row as { trading_signals?: { agent_id?: string | null; symbol?: string | null } | null; pnl_pct?: number | null; outcome?: string | null };
      const agentId = r.trading_signals?.agent_id ?? undefined;
      const symbol = r.trading_signals?.symbol ?? undefined;
      if (!agentId) continue;
      const s = statsMap.get(agentId) ?? { wins: 0, losses: 0, neutrals: 0, totalPnL: 0, count: 0, symbol: symbol ?? '' };
      s.count += 1;
      s.totalPnL += r.pnl_pct ?? 0;
      if (r.outcome === 'win') s.wins += 1;
      else if (r.outcome === 'loss') s.losses += 1;
      else s.neutrals += 1;
      if (symbol && !s.symbol) s.symbol = symbol;
      statsMap.set(agentId, s);
    }

    const statInserts: {
      agent_id: string;
      symbol: string;
      timeframe: string;
      trades_count: number;
      win_rate: number;
      avg_r_multiple: number;
      max_drawdown: number;
      last_updated_at: string;
    }[] = [];

    for (const [agentId, s] of statsMap.entries()) {
      const winRate = s.count > 0 ? s.wins / s.count : 0;
      const avgRMultiple = s.count > 0 ? s.totalPnL / s.count : 0;
      const maxDrawdown = s.count > 0 ? s.losses / s.count : 0;
      statInserts.push({
        agent_id: agentId,
        symbol: s.symbol || 'BTC/USDT',
        timeframe: '1h',
        trades_count: s.count,
        win_rate: winRate,
        avg_r_multiple: avgRMultiple,
        max_drawdown: maxDrawdown,
        last_updated_at: new Date().toISOString(),
      });
    }

    if (statInserts.length > 0) {
      const { error: upsertErr } = await db
        .from('ai_agent_stats')
        .upsert(statInserts, { onConflict: 'agent_id,timeframe' });
      if (upsertErr) throw new Error(`Failed upserting stats: ${upsertErr.message}`);
    }

    await captureCronSuccess('ai-metrics', new Date(startTime), new Date());

    return NextResponse.json({
      success: true,
      resolved: outcomeInserts.length,
      agentsUpdated: statInserts.length,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    captureCronError('ai-metrics', err, { durationMs: Date.now() - startTime });
    return NextResponse.json(
      { success: false, error: err.message, durationMs: Date.now() - startTime },
      { status: 500 }
    );
  }
}

// Also support POST for pg_cron triggering
export const POST = GET;
