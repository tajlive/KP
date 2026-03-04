// ============================================================================
// src/app/api/auto-trading/stop/route.ts
// STOP AUTO-TRADING SESSION (graceful shutdown)
// ============================================================================

import { withAuth } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";
import { StopSessionSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();
    const parsed = StopSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const db = await createClient();

    // Close any open position first (market sell)
    const { data: session } = await db
      .from("trading_sessions")
      .select("*")
      .eq("id", parsed.data.session_id)
      .eq("user_id", user.id) // RLS: only own sessions
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status === "stopped") {
      return NextResponse.json(
        { error: "Session already stopped" },
        { status: 400 },
      );
    }

    // If there's an open position, close it at current price
    if (session.open_position) {
      const pos = session.open_position as {
        quantity: number;
        entry_price: number;
      };

      // Fetch current market price for accurate P&L calculation
      let currentPrice = pos.entry_price; // fallback to entry price
      try {
        const symbol = session.trading_pair?.replace("/", "") ?? "BTCUSDT";
        const priceRes = await fetch(
          `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
        );
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          currentPrice = parseFloat(priceData.price);
        }
      } catch {
        // Use entry_price as fallback if Binance API unavailable
      }

      const { error: tradeError } = await db.from("trades").insert({
        session_id: session.id,
        user_id: user.id,
        idempotency_key: `${session.id}-close-${Date.now()}`,
        mode: session.mode,
        trading_pair: session.trading_pair,
        side: "sell",
        order_type: "market",
        quantity: pos.quantity,
        price: currentPrice,
        total_value: pos.quantity * currentPrice,
        fee: 0,
        status: "filled",
        realized_pnl: (currentPrice - pos.entry_price) * pos.quantity,
      });

      if (tradeError) {
        console.error("Failed to close position:", tradeError);
        // Continue with stop anyway
      }
    }

    // Stop the session
    const { data: updated, error } = await db
      .from("trading_sessions")
      .update({ status: "stopped", stopped_at: new Date().toISOString() })
      .eq("id", parsed.data.session_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to stop session:", error);
      return NextResponse.json(
        { error: "Failed to stop session" },
        { status: 500 },
      );
    }

    // Push notification
    await createNotification(
      db,
      user.id,
      "system",
      "Trading Session Stoppet",
      `Din trading session for ${session.trading_pair} ble stoppet.`,
      { session_id: session.id },
    );

    return NextResponse.json({ session: updated });
  } catch (err) {
    console.error("Unexpected error in stop session:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
