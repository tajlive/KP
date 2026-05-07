/**
 * POST /api/ai/autopilot/rebalance
 *
 * Daglig rebalansering av alle aktive autopilot-konfigurasjoner.
 * Triggeres av pg_cron kl 06:00 UTC.
 *
 * Flyt per autopilot:
 *   1. Kjør AI-analyse på nytt
 *   2. Sammenlign regime med forrige
 *   3. Hvis regime endret → stopp gamle sessions, start nye
 *   4. Hvis regime uendret → oppdater performance metrics
 *   5. Auto-pause ved drawdown > 10%
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAutopilotAnalysis } from "@/lib/ai/autopilot/decision-engine";
import type { RiskAppetite } from "@/lib/ai/autopilot/decision-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
  const isDev = process.env.NODE_ENV === "development";

  // Kun cron eller dev
  if (!isDev && cronSecret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await createClient();
  const startTime = Date.now();
  const results: Array<{
    user_id: string;
    regime_before: string | null;
    regime_after: string;
    action: "rebalanced" | "paused" | "no_change" | "error";
    sessions_affected: number;
    error?: string;
  }> = [];

  try {
    // ── 1. Hent alle aktive autopilot-konfigurasjoner ────────────────────
    const { data: autopilots, error: fetchErr } = await (db as any)
      .from("ai_autopilot_configs")
      .select("*")
      .eq("status", "active");

    if (fetchErr) {
      console.error("[Autopilot Rebalance] Fetch failed:", fetchErr.message);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!autopilots || autopilots.length === 0) {
      return NextResponse.json({ processed: 0, message: "No active autopilots" });
    }

    // ── 2. Prosesser hver autopilot ──────────────────────────────────────
    for (const autopilot of autopilots) {
      try {
        const userId = autopilot.user_id;
        const previousRegime = autopilot.detected_regime;

        // ── 2a. Sjekk drawdown ───────────────────────────────────────────
        const { data: sessions } = await db
          .from("trading_sessions")
          .select("initial_capital, current_capital, total_pnl, winning_trades, losing_trades")
          .eq("user_id", userId)
          .eq("mode", "paper")
          .eq("status", "active");

        let totalInitial = 0;
        let totalCurrent = 0;
        for (const s of sessions || []) {
          totalInitial += s.initial_capital ?? 0;
          totalCurrent += s.current_capital ?? 0;
        }

        const drawdown =
          totalInitial > 0
            ? ((totalInitial - totalCurrent) / totalInitial) * 100
            : 0;

        // Auto-pause ved drawdown > 10%
        if (drawdown >= 10) {
          await (db as any)
            .from("ai_autopilot_configs")
            .update({ status: "paused", updated_at: new Date().toISOString() })
            .eq("id", autopilot.id);

          // Stopp alle aktive sessions
          await db
            .from("trading_sessions")
            .update({
              status: "stopped",
              last_status_message: "Autopilot auto-pause: drawdown >= 10%",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("mode", "paper")
            .eq("status", "active");

          results.push({
            user_id: userId,
            regime_before: previousRegime,
            regime_after: previousRegime ?? "unknown",
            action: "paused",
            sessions_affected: sessions?.length ?? 0,
          });
          continue;
        }

        // ── 2b. Kjør ny AI-analyse ──────────────────────────────────────
        const decision = await runAutopilotAnalysis(
          autopilot.risk_appetite as RiskAppetite,
          autopilot.total_capital_nok,
          autopilot.max_pairs,
          db
        );

        const now = new Date().toISOString();

        // ── 2c. Oppdater metrics ────────────────────────────────────────
        const totalPnl = sessions?.reduce((sum, s) => sum + (s.total_pnl ?? 0), 0) ?? 0;
        const winRate =
          sessions && sessions.length > 0
            ? sessions.reduce((sum, s) => sum + (s.winning_trades ?? 0), 0) /
              Math.max(
                1,
                sessions.reduce(
                  (sum, s) => sum + (s.winning_trades ?? 0) + (s.losing_trades ?? 0),
                  0
                )
              )
            : 0;

        await (db as any)
          .from("ai_autopilot_configs")
          .update({
            detected_regime: decision.regime,
            total_pnl_nok: totalPnl,
            total_pnl_pct:
              totalInitial > 0 ? Math.round((totalPnl / totalInitial) * 10000) / 100 : 0,
            max_drawdown_pct: Math.round(drawdown * 100) / 100,
            win_rate: Math.round(winRate * 10000) / 100,
            last_rebalance_at: now,
            updated_at: now,
          })
          .eq("id", autopilot.id);

        // ── 2d. Hvis regime endret → rebalance sessions ─────────────────
        if (decision.regime !== previousRegime && previousRegime !== null) {
          console.info(
            `[Autopilot Rebalance] User ${userId}: regime changed ${previousRegime} → ${decision.regime}. Rebalancing.`
          );

          // Stopp gamle sessions
          const { data: stopped } = await db
            .from("trading_sessions")
            .update({
              status: "stopped",
              last_status_message: `Autopilot rebalance: regime ${previousRegime} → ${decision.regime}`,
              updated_at: now,
            })
            .eq("user_id", userId)
            .eq("mode", "paper")
            .eq("status", "active")
            .select("id");

          // Opprett nye sessions med ny strategi
          let newSessions = 0;
          for (const pairAlloc of decision.pairs) {
            const strategyConfig: Record<string, unknown> = {
              risk_level: autopilot.risk_appetite,
              pairs: [pairAlloc.symbol],
              risk_config: {}, // Will be populated by tick engine
              autopilot: true,
              confidence: pairAlloc.confidence,
            };

            const { error: insertErr } = await db.from("trading_sessions").insert({
              user_id: userId,
              mode: "paper",
              status: "active",
              strategy_id: decision.strategy,
              strategy_config: strategyConfig as never,
              starting_capital_nok: pairAlloc.capital_nok,
              current_capital_nok: pairAlloc.capital_nok,
              trading_pair: pairAlloc.symbol,
              initial_capital: pairAlloc.capital_nok,
              current_capital: pairAlloc.capital_nok,
              total_trades: 0,
              winning_trades: 0,
              losing_trades: 0,
              total_pnl: 0,
              started_at: now,
              last_heartbeat: now,
              created_at: now,
              updated_at: now,
            });

            if (!insertErr) newSessions++;
          }

          // Oppdater config med nye pairs
          await (db as any)
            .from("ai_autopilot_configs")
            .update({
              selected_strategy: decision.strategy,
              selected_pairs: decision.pairs.map((p) => p.symbol),
              capital_per_pair: Object.fromEntries(
                decision.pairs.map((p) => [p.symbol, p.capital_nok])
              ),
            })
            .eq("id", autopilot.id);

          results.push({
            user_id: userId,
            regime_before: previousRegime,
            regime_after: decision.regime,
            action: "rebalanced",
            sessions_affected: (stopped?.length ?? 0) + newSessions,
          });
        } else {
          // Ingen regime-endring — kun metrics oppdatert
          results.push({
            user_id: userId,
            regime_before: previousRegime,
            regime_after: decision.regime,
            action: "no_change",
            sessions_affected: 0,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown";
        console.error(`[Autopilot Rebalance] User ${autopilot.user_id} failed:`, msg);
        results.push({
          user_id: autopilot.user_id,
          regime_before: autopilot.detected_regime,
          regime_after: "unknown",
          action: "error",
          sessions_affected: 0,
          error: msg,
        });
      }
    }

    const summary = {
      processed: autopilots.length,
      duration_ms: Date.now() - startTime,
      rebalanced: results.filter((r) => r.action === "rebalanced").length,
      paused: results.filter((r) => r.action === "paused").length,
      no_change: results.filter((r) => r.action === "no_change").length,
      errors: results.filter((r) => r.action === "error").length,
      results,
    };

    return NextResponse.json(summary);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Autopilot Rebalance] Fatal:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
