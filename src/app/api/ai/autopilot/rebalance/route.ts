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
import { calculateAutopilotMetrics } from "@/lib/ai/autopilot/metrics";
import { normalizePair } from "@/lib/trading/pair";

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
    const { data: autopilots, error: fetchErr } = await db
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
          await db
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
        // CRITICAL: Use REAL trade history for professional metrics
        const metrics = await calculateAutopilotMetrics(db, userId, totalInitial);

        // CIRCUIT BREAKER: Auto-pause if expectancy negative for 3+ days
        const autopilotAny = autopilot as unknown as Record<string, unknown>;
        let negativeSince = autopilotAny.negative_expectancy_since
          ? new Date(autopilotAny.negative_expectancy_since as string)
          : null;

        if (metrics.expectancy < 0 && metrics.total_trades >= 10) {
          if (!negativeSince) {
            // First day of negative expectancy — mark timestamp
            negativeSince = new Date();
            await db
              .from("ai_autopilot_configs")
              .update({ negative_expectancy_since: negativeSince.toISOString() } as never)
              .eq("id", autopilot.id);
            console.warn(
              `[Autopilot ALARM] User ${userId}: expectancy ${metrics.expectancy} NOK < 0. Day 1/3 before auto-pause.`
            );
          } else {
            const daysNegative = (Date.now() - negativeSince.getTime()) / (1000 * 60 * 60 * 24);
            if (daysNegative >= 3) {
              // AUTO-PAUSE: 3+ days of negative expectancy
              console.error(
                `[Autopilot CIRCUIT BREAKER] User ${userId}: auto-paused after ${daysNegative.toFixed(1)} days of negative expectancy.`
              );
              await db
                .from("ai_autopilot_configs")
                .update({
                  status: "paused",
                  negative_expectancy_since: null,
                  updated_at: new Date().toISOString(),
                } as never)
                .eq("id", autopilot.id);

              // Stop all active sessions
              await db
                .from("trading_sessions")
                .update({
                  status: "stopped",
                  last_status_message: `Circuit breaker: negative expectancy for ${daysNegative.toFixed(0)} days`,
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", userId)
                .eq("mode", "paper")
                .eq("status", "active");

              // Log circuit breaker
              await db.from("trading_logs").insert({
                user_id: userId,
                action: "circuit_breaker",
                details: {
                  reason: "negative_expectancy_3days",
                  expectancy: metrics.expectancy,
                  win_rate: metrics.win_rate,
                  profit_factor: metrics.profit_factor,
                  total_trades: metrics.total_trades,
                  days_negative: Math.round(daysNegative),
                } as unknown as import("@/types/database.types").Json,
              } as never);

              results.push({
                user_id: userId,
                regime_before: previousRegime,
                regime_after: previousRegime ?? "unknown",
                action: "paused",
                sessions_affected: sessions?.length ?? 0,
              });
              continue;
            } else {
              console.warn(
                `[Autopilot ALARM] User ${userId}: expectancy ${metrics.expectancy} NOK < 0. Day ${Math.ceil(daysNegative)}/3 before auto-pause.`
              );
            }
          }

          // Insert daily alarm log
          await db.from("trading_logs").insert({
            user_id: userId,
            action: "autopilot_alarm",
            details: {
              alarm_type: "negative_expectancy",
              expectancy: metrics.expectancy,
              win_rate: metrics.win_rate,
              profit_factor: metrics.profit_factor,
              total_trades: metrics.total_trades,
              recommendation: "Consider pausing and reviewing strategy settings",
            } as unknown as import("@/types/database.types").Json,
          } as never);
        } else if (metrics.expectancy >= 0 && negativeSince) {
          // Expectancy recovered — reset timer
          await db
            .from("ai_autopilot_configs")
            .update({ negative_expectancy_since: null } as never)
            .eq("id", autopilot.id);
          console.info(
            `[Autopilot RECOVERY] User ${userId}: expectancy recovered to ${metrics.expectancy} NOK. Resetting negative timer.`
          );
        }

        await db
          .from("ai_autopilot_configs")
          .update({
            detected_regime: decision.regime,
            total_pnl_nok: metrics.total_pnl_nok,
            total_pnl_pct: metrics.total_pnl_pct,
            max_drawdown_pct: metrics.max_drawdown_pct,
            win_rate: metrics.win_rate,
            expectancy: metrics.expectancy,
            profit_factor: metrics.profit_factor,
            sharpe_ratio: metrics.sharpe_ratio,
            avg_win_nok: metrics.avg_win_nok,
            avg_loss_nok: metrics.avg_loss_nok,
            total_trades_count: metrics.total_trades,
            consecutive_losses: metrics.consecutive_losses,
            last_rebalance_at: now,
            updated_at: now,
          } as never)
          .eq("id", autopilot.id);

        // ── 2d. Rebalance sessions ─────────────────────────────────────
        // ALLTID stoppe gamle sessions før nye opprettes — unngå session-sprawl
        const shouldRebalance = decision.regime !== previousRegime || previousRegime === null;
        
        if (shouldRebalance) {
          console.info(
            `[Autopilot Rebalance] User ${userId}: rebalancing. Regime: ${previousRegime ?? 'null'} → ${decision.regime}. Stopping old sessions.`
          );

          // Stopp ALLE gamle sessions (paper only)
          const { data: stopped } = await db
            .from("trading_sessions")
            .update({
              status: "stopped",
              last_status_message: `Autopilot rebalance: ${previousRegime ?? 'init'} → ${decision.regime}`,
              updated_at: now,
            })
            .eq("user_id", userId)
            .eq("mode", "paper")
            .eq("status", "active")
            .select("id");

          // Opprett nye sessions — maks max_pairs
          const pairsToCreate = decision.pairs.slice(0, autopilot.max_pairs ?? 3);
          let newSessions = 0;
          for (const pairAlloc of pairsToCreate) {
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
              trading_pair: normalizePair(pairAlloc.symbol),
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

          // Oppdater config med nye pairs (respekter max_pairs)
          await db
            .from("ai_autopilot_configs")
            .update({
              selected_strategy: decision.strategy,
              selected_pairs: pairsToCreate.map((p) => p.symbol),
              capital_per_pair: Object.fromEntries(
                pairsToCreate.map((p) => [p.symbol, p.capital_nok])
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
