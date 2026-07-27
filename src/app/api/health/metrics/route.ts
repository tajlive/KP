/**
 * GET /api/health/metrics
 *
 * Enterprise health metrics endpoint. Returns live data from Supabase
 * for the admin health dashboard (HealthDashboardClient).
 *
 * Cached for 30s to avoid flooding the DB on auto-refresh.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface HealthMetrics {
  timestamp: string;
  activeUsers: number;
  recentTrades: Array<{
    id: string;
    status: string;
    created_at: string;
    realized_pnl?: number;
  }>;
  dbLatency: number;
  totalTradesToday: number;
  errors: Record<string, string | undefined>;
}

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const errors: Record<string, string | undefined> = {};
  const t0 = Date.now();

  // 1. Active users (last 24h)
  let activeUsers = 0;
  try {
    const { count } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .gte("last_sign_in_at", new Date(Date.now() - 86400000).toISOString());
    activeUsers = count ?? 0;
  } catch (e) {
    errors.activeUsers = e instanceof Error ? e.message : "Unknown error";
  }

  // 2. Recent trades (last 10)
  let recentTrades: HealthMetrics["recentTrades"] = [];
  try {
    const { data } = await supabase
      .from("trades")
      .select("id, status, created_at, realized_pnl")
      .order("created_at", { ascending: false })
      .limit(10);
    recentTrades = (data as HealthMetrics["recentTrades"]) ?? [];
  } catch (e) {
    errors.recentTrades = e instanceof Error ? e.message : "Unknown error";
  }

  // 3. Total trades today
  let totalTradesToday = 0;
  try {
    const { count } = await supabase
      .from("trades")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date().toISOString().split("T")[0]);
    totalTradesToday = count ?? 0;
  } catch (e) {
    errors.totalTradesToday = e instanceof Error ? e.message : "Unknown error";
  }

  // 4. DB latency (time from first query to now)
  const dbLatency = Date.now() - t0;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    activeUsers,
    recentTrades,
    dbLatency,
    totalTradesToday,
    errors,
  } satisfies HealthMetrics);
}
