/**
 * LiveFeed API
 *
 * GET /api/live/feed
 * Returnerer siste 20 hendelser fra hele plattformen
 * (trades, leaderboard-endringer, nye brukere, signaler)
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface LiveEvent {
  id: string;
  type: "trade" | "leaderboard" | "signup" | "signal";
  title: string;
  description: string | null;
  user_display_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** GET /api/live/feed?limit=20 */
export async function GET(request: Request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  try {
    const res = await fetch, { signal: controller.signal }
      `${supabaseUrl}/rest/v1/live_events?select=*&order=created_at.desc&limit=${limit}`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Database error", status: res.status },
        { status: res.status },
      );
    }

    const events: LiveEvent[] = await res.json();

    return NextResponse.json({ success: true, data: events });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 },
    );
  }
}
