// @ts-nocheck — admin-klient; Supabase genererte typer matcher ikke service_role-queries
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

    // 0. Award login XP (inline — uavhengig av DB-funksjoner med search_path-problemer)
    let loginAwarded = false;
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Sørg for at brukeren har en rad i user_gamification
    const { data: existing } = await db.from("user_gamification").select("id").eq("user_id", userId).maybeSingle();

    if (!existing) {
      await db.from("user_gamification").insert({ user_id: userId, current_level: 1, total_xp: 0, current_streak: 0 });
    }

    // 1. Brukerens gamification-data (fersk etter award)
    const { data: userGam, error: userErr } = (await db
      .from("user_gamification")
      .select("id, total_xp, current_level, current_streak, last_login_date")
      .eq("user_id", userId)
      .maybeSingle()) as unknown;

    if (userErr) throw userErr;

    let points: number = userGam?.total_xp ?? 0;
    let streak: number = userGam?.current_streak ?? 0;
    const level: number = userGam?.current_level ?? 1;
    let lastLoginDate: string | null = userGam?.last_login_date ?? null;

    // Award login XP om ikke allerede gjort i dag
    if (lastLoginDate !== today && userGam?.id) {
      const prevStreak = userGam.current_streak ?? 0;
      const newStreak = lastLoginDate === yesterday ? prevStreak + 1 : 1;
      const xp = 50 + Math.min(newStreak - 1, 10) * 5;

      await db.from("user_gamification").update({
        total_xp: (userGam.total_xp ?? 0) + xp,
        current_streak: newStreak,
        last_login_date: today,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);

      await db.from("xp_transactions").insert({
        user_id: userId,
        amount: xp,
        action: "daily_login",
        description: `Daglig login — streak ${newStreak}`,
        previous_xp: userGam.total_xp ?? 0,
        new_xp: (userGam.total_xp ?? 0) + xp,
      });

      points = (userGam.total_xp ?? 0) + xp;
      streak = newStreak;
      lastLoginDate = today;
      loginAwarded = true;
    }

    // 2. Rank — tell brukere med mer XP
    const { count } = (await db
      .from("user_gamification")
      .select("*", { count: "exact", head: true })
      .gt("total_xp", points)) as unknown;
    const rank = (count ?? 0) + 1;

    // 3. Daglige utfordringer (today, yesterday deklarert ovenfor)

    const { count: winningTrades } = (await db
      .from("trades")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("executed_at", today + "T00:00:00Z")
      .gt("realized_pnl", 0)) as unknown;

    const { data: strategies } = (await db
      .from("trades")
      .select("strategy_signal")
      .eq("user_id", userId)
      .not("strategy_signal", "is", null)
      .limit(20)) as unknown;

    const usedStrategies = new Set<string>();
    for (const t of strategies ?? []) {
      if (t.strategy_signal?.strategy) {
        usedStrategies.add(t.strategy_signal.strategy);
      }
    }

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
      loginAwarded,
    });
  } catch (err) {
    console.error("Gamification stats error:", err);
    return NextResponse.json(
      { error: "Failed to fetch gamification stats" },
      { status: 500 },
    );
  }
}
