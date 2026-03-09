/**
 * KLA-137: Live Trading Execution API
 * 
 * PHYSICALLY SEPARATED from paper trading.
 * Uses executeLiveTrade from safety layer.
 */

import { executeLiveTrade } from "@/lib/trading/safety";
import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const executeSchema = z.object({
  session_id: z.string().uuid(),
  symbol: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  order_type: z.enum(["market", "limit"]).default("market"),
  bot_id: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabase = createServerClient(request, response);
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = executeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid trade data", details: validation.error.format() },
        { status: 400 },
      );
    }

    const { session_id, symbol, side, quantity, price, order_type, bot_id } = validation.data;

    // Execute live trade via SAFETY LAYER
    const result = await executeLiveTrade({
      userId: user.id,
      sessionId: session_id,
      symbol: symbol.toUpperCase(),
      side,
      quantity,
      price,
      orderType: order_type,
      botId: bot_id,
    });

    if (!result.success) {
      // Check if it was rejected by safety layer or execution error
      if (result.rejectionReason) {
        return NextResponse.json({
          success: false,
          error: result.error,
          rejectionReason: result.rejectionReason,
          type: "TRADE_REJECTED",
        }, { status: 200 }); // 200 because request was valid, trade was just blocked
      }

      return NextResponse.json(
        { error: result.error || "Live execution failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      trade: {
        tradeId: result.tradeId,
        orderId: result.orderId,
        symbol: symbol.toUpperCase(),
        side,
        executedQuantity: result.executedQuantity,
        executedPrice: result.executedPrice,
        fee: result.fee,
      },
    });
  } catch (error) {
    console.error("[LiveTradeAPI] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
