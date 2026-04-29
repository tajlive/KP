/**
 * @file getUserDashboardMetrics.integration.test.ts
 * @description Integration test against REAL Supabase DB.
 *
 * Strategy: Compute expected values from raw tables, then verify
 * getUserDashboardMetrics() returns identical results. This avoids
 * hardcoded expectations that break when new sessions/trades are added.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in env.
 * Skipped in CI if env vars are missing.
 */

import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getUserDashboardMetrics } from "../getUserDashboardMetrics";
import type { Database } from "@/types/database.types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TEST_USER_ID = "6408d389-2021-4a2f-92b6-bebf0459a398"; // tomarnejensen@gmail.com

const itif = URL && KEY ? it : it.skip;

describe("getUserDashboardMetrics integration", () => {
  itif("matches manual computation from raw tables for tomarnejensen@gmail.com", async () => {
    const supabase = createClient<Database>(URL!, KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Ensure RPC function exists
    const { error: rpcCheckError } = await supabase.rpc("get_dashboard_metrics", {
      p_user_id: TEST_USER_ID,
      p_mode: "paper",
      p_statuses: ["active", "stopped"],
    });

    if (rpcCheckError && rpcCheckError.message.includes("does not exist")) {
      console.warn("Integration test skipped: RPC not deployed yet");
      return;
    }

    // ------------------------------------------------------------------
    // 1. Fetch raw sessions (active + stopped, not archived)
    // ------------------------------------------------------------------
    const { data: sessions, error: sessionsError } = await supabase
      .from("trading_sessions")
      .select("id, current_capital_nok, starting_capital_nok")
      .eq("user_id", TEST_USER_ID)
      .eq("mode", "paper")
      .is("archived", false)
      .in("status", ["active", "stopped"]);

    expect(sessionsError).toBeNull();
    const sessionIds = (sessions ?? []).map((s) => s.id);

    const expectedTotalCapital = (sessions ?? []).reduce(
      (sum, s) => sum + Number(s.current_capital_nok ?? 0),
      0,
    );
    const expectedStartingCapital = (sessions ?? []).reduce(
      (sum, s) => sum + Number(s.starting_capital_nok ?? 0),
      0,
    );

    // ------------------------------------------------------------------
    // 2. Fetch raw trades for those sessions
    // ------------------------------------------------------------------
    let expectedTotalTrades = 0;
    let expectedTotalPnl = 0;
    let expectedWinningTrades = 0;
    let expectedLosingTrades = 0;

    if (sessionIds.length > 0) {
      const { data: trades, error: tradesError } = await supabase
        .from("trades")
        .select("realized_pnl")
        .in("session_id", sessionIds)
        .eq("user_id", TEST_USER_ID)
        .eq("mode", "paper")
        .not("status", "in", "(cancelled,failed)");

      expect(tradesError).toBeNull();

      for (const t of trades ?? []) {
        expectedTotalTrades += 1;
        const pnl = Number(t.realized_pnl ?? 0);
        expectedTotalPnl += pnl;
        if (pnl > 0) expectedWinningTrades += 1;
        else if (pnl < 0) expectedLosingTrades += 1;
      }
    }

    const expectedWinRate =
      expectedWinningTrades + expectedLosingTrades > 0
        ? expectedWinningTrades / (expectedWinningTrades + expectedLosingTrades)
        : 0;

    // ------------------------------------------------------------------
    // 3. Call the unified function
    // ------------------------------------------------------------------
    const result = await getUserDashboardMetrics({
      supabaseClient: supabase,
      userId: TEST_USER_ID,
      mode: "paper",
      sessionScope: "active_and_completed",
    });

    // ------------------------------------------------------------------
    // 4. Assert: function output must match raw-table computation
    // ------------------------------------------------------------------
    expect(result.totalTrades).toBe(expectedTotalTrades);
    expect(result.totalPnl).toBeCloseTo(expectedTotalPnl, 2);
    expect(result.winningTrades).toBe(expectedWinningTrades);
    expect(result.losingTrades).toBe(expectedLosingTrades);
    expect(result.winRate).toBeCloseTo(expectedWinRate, 2);
    expect(result.totalCapital).toBeCloseTo(expectedTotalCapital, 2);
    expect(result.startingCapital).toBeCloseTo(expectedStartingCapital, 2);
  });
});
