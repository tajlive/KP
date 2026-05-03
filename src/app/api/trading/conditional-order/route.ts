/**
 * Conditional Order API - Stop Loss & Take Profit
 *
 * Creates conditional orders that execute when price conditions are met:
 * - STOP_LOSS: Triggers when price falls to trigger price (for long positions)
 * - TAKE_PROFIT: Triggers when price rises to trigger price (for long positions)
 * - TRAILING_STOP: Dynamic stop that follows price with a set distance
 *
 * For paper trading: Orders are monitored and executed by a CRON job
 * For live trading: Orders are submitted to Binance as OCO orders
 */

import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Validation schema
const ConditionalOrderSchema = z.object({
  session_id: z.string().uuid(),
  symbol: z.string().regex(/^[A-Z]{3,10}USDT$/),
  type: z.enum(["stop_loss", "take_profit", "trailing_stop"]),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
  trigger_price: z.number().positive(),
  limit_price: z.number().positive().optional(),
  trailing_percent: z.number().positive().optional(),
});

type ConditionalOrderType = "stop_loss" | "take_profit" | "trailing_stop";

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse and validate request
    const body = await request.json();
    const validation = ConditionalOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.format() },
        { status: 400 },
      );
    }

    const {
      session_id,
      symbol,
      type,
      side,
      quantity,
      trigger_price,
      limit_price,
      trailing_percent,
    } = validation.data;

    // Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from("trading_sessions")
      .select("id, user_id, mode, status, current_capital_nok, trading_pair")
      .eq("id", session_id)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { error: `Session is ${session.status}` },
        { status: 400 },
      );
    }

    // Validate position exists for sell orders
    if (side === "sell") {
      const { data: position } = await supabase
        .from("positions")
        .select("quantity")
        .eq("user_id", user.id)
        .eq("symbol", symbol)
        .single();

      if (!position || position.quantity < quantity) {
        return NextResponse.json(
          {
            error: `Insufficient position: have ${position?.quantity ?? 0}, want to sell ${quantity}`,
          },
          { status: 400 },
        );
      }
    }

    // Validate order makes sense
    const currentPrice = await fetchCurrentPrice(symbol);

    if (type === "stop_loss" && side === "sell") {
      // For long positions: stop loss trigger should be below current price
      if (trigger_price >= currentPrice) {
        return NextResponse.json(
          {
            error: `Stop loss trigger (${trigger_price}) must be below current price (${currentPrice})`,
          },
          { status: 400 },
        );
      }
    }

    if (type === "take_profit" && side === "sell") {
      // For long positions: take profit trigger should be above current price
      if (trigger_price <= currentPrice) {
        return NextResponse.json(
          {
            error: `Take profit trigger (${trigger_price}) must be above current price (${currentPrice})`,
          },
          { status: 400 },
        );
      }
    }

    // Create conditional order
    const orderData = {
      user_id: user.id,
      session_id,
      symbol,
      type,
      side,
      quantity,
      trigger_price,
      limit_price: limit_price || trigger_price,
      trailing_percent: type === "trailing_stop" ? trailing_percent : null,
      current_price_at_creation: currentPrice,
      status: "pending",
      mode: session.mode,
      created_at: new Date().toISOString(),
    };

    // For live trading, also submit to Binance
    if (session.mode === "live") {
      // TODO: Submit OCO order to Binance
    }

    // Store in database
    const { data: order, error: orderError } = await supabase
      .from("conditional_orders")
      .insert(orderData as never).select()
      .single();

    if (orderError) {
      console.error("Failed to create conditional order:", orderError);
      return NextResponse.json(
        { error: "Failed to create conditional order" },
        { status: 500 },
      );
    }

    // Log activity
    await supabase.from("user_activity_logs").insert({
      user_id: user.id,
      action: "conditional_order_created",
      details: {
        order_id: order.id,
        type,
        symbol,
        trigger_price,
        quantity,
      },
    } as never);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        type,
        symbol,
        side,
        quantity,
        trigger_price,
        limit_price: orderData.limit_price,
        status: "pending",
        created_at: order.created_at,
      },
      message: getOrderCreationMessage(type, trigger_price, symbol),
    });
  } catch (error) {
    console.error("Conditional order error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// GET - List user's conditional orders
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const session_id = searchParams.get("session_id");
  const status = searchParams.get("status");

  try {
    let query = supabase
      .from("conditional_orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (session_id) {
      query = query.eq("session_id", session_id);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data: orders, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 },
      );
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (error) {
    console.error("Fetch conditional orders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - Cancel a conditional order
export async function DELETE(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const order_id = searchParams.get("order_id");

  if (!order_id) {
    return NextResponse.json({ error: "order_id required" }, { status: 400 });
  }

  try {
    // Verify order belongs to user
    const { data: order } = await supabase
      .from("conditional_orders")
      .select("id, status, mode")
      .eq("id", order_id)
      .eq("user_id", user.id)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot cancel order with status: ${order.status}` },
        { status: 400 },
      );
    }

    // For live trading, also cancel on Binance
    if (order.mode === "live") {
      // TODO: Cancel order on Binance
    }

    // Update status to cancelled
    const { error } = await supabase
      .from("conditional_orders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() } as never).eq("id", order_id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to cancel order" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, message: "Order cancelled" });
  } catch (error) {
    console.error("Cancel order error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Helper functions
async function fetchCurrentPrice(symbol: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return parseFloat(data.price);
  } catch {
    return 0;
  }
}

function getOrderCreationMessage(
  type: ConditionalOrderType,
  price: number,
  symbol: string,
): string {
  switch (type) {
    case "stop_loss":
      return `Stop-loss order created at $${price} for ${symbol}`;
    case "take_profit":
      return `Take-profit order created at $${price} for ${symbol}`;
    case "trailing_stop":
      return `Trailing stop order created for ${symbol}`;
    default:
      return `Conditional order created for ${symbol}`;
  }
}
