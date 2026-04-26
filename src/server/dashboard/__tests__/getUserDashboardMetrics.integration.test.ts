/**
 * @file getUserDashboardMetrics.integration.test.ts
 * @description Integration test against REAL Supabase DB.
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
  itif("matches manual SQL reconciling for tomarnejensen@gmail.com", async () => {
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

    const result = await getUserDashboardMetrics({
      supabaseClient: supabase,
      userId: TEST_USER_ID,
      mode: "paper",
      sessionScope: "active_and_completed",
    });

    // Manual SQL reconciling from 2026-04-26:
    // 8 paper sessions, 12 trades, 71 000 NOK P&L
    expect(result.totalTrades).toBe(12);
    expect(result.totalPnl).toBe(71000);
    expect(result.winningTrades).toBe(5);
    expect(result.losingTrades).toBe(0);
    expect(result.winRate).toBe(1);

    // SUM of current_capital_nok across all 8 sessions:
    // 89990 + 100071000 + 9000 + 94995 + 100000 + 89990 + 100000 + 47488.89
    expect(result.totalCapital).toBe(100602463.89);

    // SUM of starting_capital_nok across all 8 sessions:
    // 100000 + 100000000 + 10000 + 100000 + 100000 + 100000 + 100000 + 50000
    expect(result.startingCapital).toBe(100560000);
  });
});
