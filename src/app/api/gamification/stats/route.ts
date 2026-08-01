import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const db = getAdminClient();

    // 1. Brukerens gamification-data
    const { data: userGam, error: userErr } = (await db
      .from("user_gamification")
      .select("total_xp, current_level, current_streak, last_login_date")
      .eq("user_id", userId)
      .maybeSingle()) as any;

    if (userErr) throw userErr;

    const points: number = userGam?.total_xp ?? 0;
    const streak: number = userGam?.current_streak ?? 0;
    const level: number = userGam?.current_level ?? 1;
    const lastLoginDate: string | null = userGam?.last_login_date ?? null;

    // 2. Rank — tell brukere med mer XP
    const { count } = (await db
      .from("user_gamification")
      .select("*", { count: "exact", head: true })
      .gt("total_xp", points)) as any;
    const rank = (count ?? 0) + 1;

    // 3. Daglige utfordringer
    const today = new Date().toISOString().split("T")[0];

    // Vinnende streak
    const { count: winningTrades } = (await db
      .from("trades")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("executed_at", today + "T00:00:00Z")
      .gt("realized_pnl", 0)) as any;

    // Utforsk strategi
    const { data: strategies } = (await db
      .from("trades")
      .select("strategy_signal")
      .eq("user_id", userId)
      .not("strategy_signal", "is", null)
      .limit(20)) as any;
    const usedStrategies = new Set<string>();
    for (const t of strategies ?? []) {
      if (t.strategy_signal?.strategy) {
        usedStrategies.add(t.strategy_signal.strategy);
      }
    }

    // Daglig login
    const loggedInToday = lastLoginDate === today;

    const challenges = [
      {
        id: "winning_streak",
        title: "Vinnende streak",
        description: "Gjennomfør 3 handler med positiv avkastning",
        current: Math.min(winningTrades ?? 0, 3),
        target: 3,
        reward: 500,
        completed: (winningTrades ?? 0) >= 3,
      },
      {
        id: "explore_strategy",
        title: "Utforsk strategi",
        description: "Prøv en ny trading-strategi (DCA, Grid, etc.)",
        current: Math.min(usedStrategies.size, 1),
        target: 1,
        reward: 300,
        completed: usedStrategies.size >= 1,
      },
      {
        id: "daily_login",
        title: "Daglig login",
        description: "Besøk dashboardet i dag",
        current: loggedInToday ? 1 : 0,
        target: 1,
        reward: 100,
        completed: loggedInToday,
      },
    ];

    return NextResponse.json({
      points,
      rank,
      streak,
      level,
      lastLoginDate,
      challenges,
    });
  } catch (err) {
    console.error("Gamification stats error:", err);
    return NextResponse.json(
      { error: "Failed to fetch gamification stats" },
      { status: 500 },
    );
  }
}
