import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/leaderboard?period=weekly */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "weekly";

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("leaderboard_entries")
      .select("*")
      .eq("period", period)
      .eq("is_public", true)
      .order("rank", { ascending: true })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    // Anonymiser user_display_name — FACT-AUDIT 2.1/2.2:
    // leaderboard_entries har AI-genererte navn. Vis kun anonymisert ID.
    const safe = (data ?? []).map((entry) => ({
      ...entry,
      user_display_name: entry.user_id
        ? `Trader***${String(entry.user_id).slice(0, 4)}`
        : "Trader",
    }));

    const response = NextResponse.json(safe);
    response.headers.set("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 },
    );
  }
}
