/**
 * KLA-137: Paper Trading Trade API
 *
 * DEPRECATED: Use POST /api/paper-trading/execute with { symbol, side, quantity, price } instead.
 * Kept for backward compatibility. Uses executePaperTrade from safety layer.
 */

import { executePaperTrade } from "@/lib/trading/safety";
import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

const tradeSchema = z.object({
  symbol: z.string().min(1).max(10),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
  price: z.number().positive(),
  botId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Create response for cookie handling
    const response = NextResponse.next();

    // Get authenticated user using SSR client with cookies
    const supabase = createServerClient(request, response);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = tradeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid trade data", details: validation.error.format() },
        { status: 400 },
      );
    }

    const { symbol, side, quantity, price, botId } = validation.data;

    // Execute paper trade via SAFETY LAYER
    const result = await executePaperTrade({
      userId: user.id,
      symbol: symbol.toUpperCase(),
      side,
      quantity,
      price,
      orderType: "market",
      botId,
    });

    if (!result.success) {
      // Return 200 with rejection info (trade was blocked by safety)
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          rejectionReason: result.rejectionReason,
          type: "TRADE_REJECTED",
        },
        { status: 200 },
      ); // 200 because the request was valid, trade was just blocked
    }

    return NextResponse.json({
      success: true,
      trade: {
        symbol: symbol.toUpperCase(),
        side,
        quantity,
        price,
        total_value: quantity * price,
      },
      new_balance: result.newBalance,
      trade_id: result.tradeId,
    });
  } catch (error: unknown) {
    console.error("[PaperTradeAPI] Unexpected error:", error);

    return NextResponse.json(
      { error: "Failed to execute paper trade" },
      { status: 500 },
    );
  }
}
