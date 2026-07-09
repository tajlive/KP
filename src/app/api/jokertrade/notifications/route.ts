/**
 * JokerPush API
 *
 * GET /api/jokertrade/notifications
 * Returnerer siste Joker-handler med forklaring (offentlig data)
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface JokerNotification {
  id: string;
  user_display_name: string;
  title: string;
  description: string;
  trading_pair: string;
  side: string;
  quantity: number;
  price: number;
  executed_at: string;
}

/** GET /api/jokertrade/notifications?limit=20 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  try {
    // Hent Joker-trades med forklaring via REST (offentlig)
    const res = await fetch(
      `${supabaseUrl}/rest/v1/trades?select=id,trading_pair,side,quantity,price,executed_at,joker_explanation,user_id&joker_trade=eq.true&not.joker_explanation=is.null&order=executed_at.desc&limit=${limit}`,
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

    const trades = await res.json();

    // Hent display_name for hver unique user_id
    const userIds = [...new Set(trades.map((t: any) => t.user_id))];
    const displayNames: Record<string, string> = {};

    if (userIds.length > 0) {
      const userFilter = userIds.map((id) => `id.eq.${id}`).join(",");
      const userRes = await fetch(
        `${supabaseUrl}/rest/v1/user_profiles?select=id,display_name&or=(${userFilter})`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        },
      );
      if (userRes.ok) {
        const users = await userRes.json();
        for (const u of users) {
          displayNames[u.id] = u.display_name || "Trader";
        }
      }
    }

    const notifications: JokerNotification[] = trades.map((t: any) => ({
      id: t.id,
      user_display_name: displayNames[t.user_id] || "Trader",
      title: `🎭 ${displayNames[t.user_id] || "Trader"} — ${t.side === "buy" ? "🟦 Kjøp" : "🔴 Salg"} ${t.trading_pair}`,
      description: t.joker_explanation || "🎭 JokerTrade",
      trading_pair: t.trading_pair,
      side: t.side,
      quantity: t.quantity,
      price: t.price,
      executed_at: t.executed_at,
    }));

    return NextResponse.json({ success: true, data: notifications });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 },
    );
  }
}
