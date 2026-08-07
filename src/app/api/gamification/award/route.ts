import { createServerClient, createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { trackCriticalAction } from "@/lib/sentry";
import { z } from "zod";

export const dynamic = "force-dynamic";

// XP awards configuration
const XP_AWARDS: { [key: string]: number } = {
  login: 50,
  onboarding_complete: 500,
  paper_trade_started: 250,
  binance_connected: 2000,
  lav_risk_streak: 300,
  first_trade: 100,
  profitable_trade: 150,
  course_completed: 200,
  referral_used: 500,
};

const awardSchema = z.object({
  action: z.enum([
    "login",
    "onboarding_complete",
    "paper_trade_started",
    "binance_connected",
    "lav_risk_streak",
    "first_trade",
    "profitable_trade",
    "course_completed",
    "referral_used",
  ]),
});

/**
 * POST /api/gamification/award
 * Awards XP to the current user
 * Uses database function award_xp() for atomic updates and level-up detection
 */
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.next();
    // Timeout guard for createServerClient (can hang in Workers)
    const clientPromise = createServerClient(request, response);
    const timeout = 3000;
    const supabaseAuth = (await Promise.race([
      clientPromise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Supabase server client timeout")),
          timeout,
        ),
      ),
    ])) as Awaited<ReturnType<typeof createServerClient>>;
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();
    const body = await request.json();
    const parsed = awardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid action", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { action } = parsed.data;

    // Handle login action specially (with streak calculation)
    if (action === "login") {
      const { data: result, error } = await supabase.rpc("award_login_xp", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("award_login_xp error:", error);
        return NextResponse.json(
          { error: "Failed to award login XP" },
          { status: 500 },
        );
      }

      // result is an array with one row
      const row = Array.isArray(result) ? result[0] : result;

      if (!row.success && row.already_claimed) {
        return NextResponse.json({
          message: "Already claimed today",
          state: {
            current_level: row.new_level,
            total_xp: row.new_xp,
            current_streak: row.streak,
          },
          levelUp: false,
          alreadyClaimed: true,
        });
      }

      return NextResponse.json({
        state: {
          current_level: row.new_level,
          total_xp: row.new_xp,
          current_streak: row.streak,
        },
        awardedXp: row.awarded_xp,
        levelUp: row.level_up,
        streak: row.streak,
      });
    }

    const xpToAward = XP_AWARDS[action];

    // Award XP using database function
    const { data: result, error } = await supabase.rpc("award_xp", {
      p_user_id: user.id,
      p_amount: xpToAward,
      p_action: action,
      p_description: `Awarded for: ${action}`,
      p_metadata: { source: "api", timestamp: new Date().toISOString() },
    });

    if (error) {
      console.error("award_xp error:", error);
      return NextResponse.json(
        { error: "Failed to award XP" },
        { status: 500 },
      );
    }

    // result is an array with one row
    const row = Array.isArray(result) ? result[0] : result;

    if (action === "first_trade") {
      trackCriticalAction("first_trade", { userId: user.id });
    }

    // Fetch updated state
    const { data: gamification } = await supabase
      .from("user_gamification")
      .select("current_level, total_xp, current_streak, last_login_date")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      state: gamification || {
        current_level: row.new_level,
        total_xp: row.new_xp,
        current_streak: 0,
      },
      awardedXp: xpToAward,
      levelUp: row.level_up,
      message: row.message,
    });
  } catch (error) {
    console.error("Gamification POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/gamification/award
 * Returns current gamification state for the user
 */
export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabaseAuth = createServerClient(request, response);
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();
    const { data: gamification, error } = await supabase
      .from("user_gamification")
      .select(
        "current_level, total_xp, current_streak, last_login_date, level_up_at",
      )
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found
      console.error("Fetch gamification error:", error);
      return NextResponse.json(
        { error: "Failed to fetch state" },
        { status: 500 },
      );
    }

    // Calculate XP needed for next level
    // Formula: Level = floor(sqrt(total_xp / 100)) + 1
    // So: next_level_xp = (level)^2 * 100
    const currentLevel = gamification?.current_level || 1;
    const totalXp = gamification?.total_xp || 0;
    const nextLevelXp = currentLevel * currentLevel * 100;
    const xpNeeded = nextLevelXp - totalXp;

    return NextResponse.json({
      state: gamification || {
        current_level: 1,
        total_xp: 0,
        current_streak: 0,
      },
      xpProgress: {
        current: totalXp,
        needed: nextLevelXp,
        remaining: xpNeeded,
        percent: Math.min(100, Math.round((totalXp / nextLevelXp) * 100)),
      },
    });
  } catch (error) {
    console.error("Gamification GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
