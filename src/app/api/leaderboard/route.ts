import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/leaderboard?period=weekly */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "weekly";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/leaderboard_entries?period=eq.${period}&is_public=eq.true&order=rank.asc&limit=50`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Supabase error", status: res.status },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 },
    );
  }
}
