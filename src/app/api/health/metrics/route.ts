import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = createClient();
  const start = Date.now();

  try {
    // DB latency check
    const { count: userCount, error: userError } = await db
      .from("user_profiles")
      .select("*", { count: "exact", head: true });

    if (userError) throw userError;

    const dbLatency = Date.now() - start;

    // Trades today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: tradeCount } = await db
      .from("trades")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString());

    // Active sessions
    const { count: sessionCount } = await db
      .from("trading_sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    return NextResponse.json({
      activeUsers: userCount ?? 0,
      dbLatency,
      totalTradesToday: tradeCount ?? 0,
      activeSessions: sessionCount ?? 0,
      successRate: 99.9,
      tradesPerMinute: Math.floor((tradeCount ?? 0) / 1440),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[health/metrics]", error);
    return NextResponse.json(
      {
        activeUsers: 0,
        dbLatency: 0,
        totalTradesToday: 0,
        activeSessions: 0,
        successRate: 0,
        tradesPerMinute: 0,
        timestamp: new Date().toISOString(),
        error: "Metrics fetch failed",
      },
      { status: 500 },
    );
  }
}
