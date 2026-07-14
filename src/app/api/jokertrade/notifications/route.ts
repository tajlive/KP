/**
 * JokerPush API
 *
 * GET /api/jokertrade/notifications
 * Returnerer siste Joker-handler med forklaring (offentlig data)
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const supabase = createClient();

    // Hent Joker-trades med forklaring
    const { data: trades, error: tradesError } = await supabase
      .from("trades")
      .select("id, trading_pair, side, quantity, price, executed_at, joker_explanation, user_id")
      .eq("joker_trade", true)
      .not("joker_explanation", "is", null)
      .order("executed_at", { ascending: false })
      .limit(limit);

    if (tradesError) {
      return NextResponse.json(
        { error: "Database error", status: 400 },
        { status: 400 },
      );
    }

    // Hent display_name for hver unique user_id
    const userIds = [...new Set(trades.map((t: any) => t.user_id))];
    const displayNames: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("user_profiles")
        .select("id, display_name")
        .in("id", userIds);

      if (users) {
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
