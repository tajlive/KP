/**
 * Trade Explanations API
 * 
 * Returns trades with human-readable explanations for a trading session
 * Includes indicator snapshots for chart visualization
 */

import { createClient } from "@/lib/supabase/server";
import { generateExplanation } from "@/lib/trader-explanations";
import type { TradeReasonCode, TradeReasonParams, IndicatorSnapshot } from "@/types/trading";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface TradeWithExplanation {
  id: string;
  executed_at: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  total_value: number;
  realized_pnl: number | null;
  reason_code: TradeReasonCode | null;
  explanation: {
    title: string;
    body: string;
    mood: "positive" | "negative" | "neutral" | "warning";
  };
  indicators: {
    rsi?: number;
    macd?: number;
    macd_signal?: number;
    sma_20?: number;
    sma_50?: number;
    price?: number;
    price_24h_ago?: number;
    volatility?: number;
  } | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  try {
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const locale = (searchParams.get("locale") as "no" | "en") || "no";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const supabase = await createClient();

    // Verify user owns this session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch session to verify ownership
    const { data: session } = await supabase
      .from("trading_sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .single();

    if (!session || session.user_id !== user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Fetch trades with reason data
    const { data: trades, error } = await supabase
      .from("trades")
      .select("id, executed_at, side, price, quantity, total_value, realized_pnl, reason_code, reason_params, indicator_snapshot")
      .eq("session_id", sessionId)
      .eq("status", "filled")
      .order("executed_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching trades:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Transform to include explanations
    const tradesWithExplanations: TradeWithExplanation[] = (trades || []).map((trade) => {
      const explanation = generateExplanation({
        reasonCode: trade.reason_code as TradeReasonCode | null,
        reasonParams: trade.reason_params as unknown as TradeReasonParams | null,
        indicatorSnapshot: trade.indicator_snapshot as unknown as IndicatorSnapshot | null,
        side: trade.side as "buy" | "sell",
        locale,
      });

      return {
        id: trade.id,
        executed_at: trade.executed_at,
        side: trade.side as "buy" | "sell",
        price: trade.price,
        quantity: trade.quantity,
        total_value: trade.total_value,
        realized_pnl: trade.realized_pnl,
        reason_code: trade.reason_code as TradeReasonCode | null,
        explanation: {
          title: explanation.title,
          body: explanation.body,
          mood: explanation.mood,
        },
        indicators: trade.indicator_snapshot as unknown as IndicatorSnapshot | null,
      };
    });

    return NextResponse.json({
      session_id: sessionId,
      trades: tradesWithExplanations,
      count: tradesWithExplanations.length,
    });
  } catch (error) {
    console.error("Error in trades API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
