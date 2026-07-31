import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/coin-prices
 * Returns real-time coin prices for the live market ticker.
 * No auth required — publicly cached market data.
 */
export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("coin_prices")
      .select("*")
      .order("symbol", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch prices" },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? [], {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("[coin-prices] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
