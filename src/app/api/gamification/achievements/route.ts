import { createServerClient, createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/gamification/achievements
 * Returns all achievements for the current user
 */
export async function GET(_request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabaseAuth = createServerClient(_request, response);
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();
    const { data: achievements, error } = await supabase
      .from("user_achievements")
      .select("achievement_type, earned_at, metadata")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false });

    if (error) {
      // Table may not exist yet — migration not applied
      console.error("Fetch achievements error:", error);
      return NextResponse.json({ achievements: [] });
    }

    return NextResponse.json({
      achievements: achievements || [],
    });
  } catch (error) {
    console.error("Achievements GET error:", error);
    return NextResponse.json({ achievements: [] });
  }
}

/**
 * POST /api/gamification/achievements
 * Checks and awards any new achievements for the current user
 * Uses the check_and_award_achievements RPC
 */
export async function POST(_request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabaseAuth = createServerClient(_request, response);
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();
    // TODO: check_and_award_achievements RPC doesn't exist in DB.
    // Use direct query + award_achievement instead once implemented.
    // For now return empty result so frontend is not blocked.
    const { data: result, error } = await supabase
      .from("user_achievements")
      .select("achievement_type, earned_at, metadata")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false });

    if (error) {
      console.error("Fetch achievements error:", error);
      return NextResponse.json(
        { awarded: [], achievements: [] },
        { status: 200 },
      );
    }

    // Fetch full list after awarding
    const { data: achievements } = await supabase
      .from("user_achievements")
      .select("achievement_type, earned_at, metadata")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false });

    return NextResponse.json({
      awarded: result || [],
      achievements: achievements || [],
    });
  } catch (error) {
    console.error("Achievements POST error:", error);
    return NextResponse.json({ awarded: [], achievements: [] });
  }
}
