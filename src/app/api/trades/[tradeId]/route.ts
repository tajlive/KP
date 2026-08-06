import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database.types";

export type TradeWithAiDetails = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  total_value: number;
  fee: number;
  realized_pnl: number | null;
  mode: "paper" | "live";
  status: string;
  created_at: string;
  executed_at: string;
  strategy_signal?: Record<string, unknown>;
  ai_decision?: {
    sentiment_reasoning?: string;
    sentiment_confidence?: number;
    sentiment_recommendation?: string;
  } | null;
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  exitReason?: string;
};

type TradesRow = Database["public"]["Tables"]["trades"]["Row"];

interface TradeWithAi extends TradesRow {
  ai_decision?: {
    sentiment_reasoning?: string;
    sentiment_confidence?: number;
    sentiment_recommendation?: string;
  } | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  exit_reason?: string | null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tradeId: string }> },
) {
  try {
    const { tradeId } = await params;
    const supabase = await createServerClient();

    // Hent bruker
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
    }

    // Hent trade med AI decision join
    const { data: trade, error: tradeError } = await supabase
      .from("trades")
      .select(`
        *,
        ai_decision:ai_decision_id (
          sentiment_reasoning,
          sentiment_confidence,
          sentiment_recommendation
        )
      `)
      .eq("id", tradeId)
      .eq("user_id", user.id)
      .single();

    if (tradeError || !trade) {
      return NextResponse.json(
        { error: "Handel ikke funnet" },
        { status: 404 },
      );
    }

    // Type assertion for joined data
    const tradeWithAi = trade as TradeWithAi;

    // Beregn utgangspris hvis det er et salg
    const signal = tradeWithAi.strategy_signal as Record<string, unknown> | undefined;
    
    const response: TradeWithAiDetails = {
      id: tradeWithAi.id,
      symbol: tradeWithAi.trading_pair,
      side: String(tradeWithAi.side).toLowerCase() as "buy" | "sell",
      quantity: tradeWithAi.quantity,
      price: tradeWithAi.price,
      total_value: tradeWithAi.total_value,
      fee: tradeWithAi.fee,
      realized_pnl: tradeWithAi.realized_pnl,
      mode: tradeWithAi.mode as "paper" | "live",
      status: tradeWithAi.status,
      created_at: tradeWithAi.created_at,
      executed_at: tradeWithAi.executed_at ?? tradeWithAi.created_at,
      strategy_signal: signal,
      ai_decision: tradeWithAi.ai_decision || null,
      entryPrice: tradeWithAi.price,
      exitPrice: signal?.exit_price as number | undefined,
      stopLoss: tradeWithAi.stop_loss ?? (signal?.stop_loss as number | undefined),
      takeProfit: tradeWithAi.take_profit ?? (signal?.take_profit as number | undefined),
      exitReason: tradeWithAi.exit_reason ?? (signal?.exit_reason as string | undefined),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching trade details:", error);
    return NextResponse.json(
      { error: "Intern serverfeil" },
      { status: 500 },
    );
  }
}
