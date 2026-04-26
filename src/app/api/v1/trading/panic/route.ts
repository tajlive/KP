/**
 * /api/v1/trading/panic — Emergency Close-All
 *
 * P0 Safety Feature: Sells all open positions in a live session immediately.
 * Designed for flash-crash or runaway-bot scenarios.
 *
 * POST body: { sessionId: string, reason?: string }
 * Returns:   { success, positionsClosed, totalValueClosed, errors, sessionId }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { executeTrade } from "@/lib/trading/core/execute-trade";

// ---------------------------------------------------------------------------
// Rate limit: max 1 panic per 60 s per user (in-memory, resets on cold start)
// ---------------------------------------------------------------------------
const panicCooldown = new Map<string, number>();
const PANIC_COOLDOWN_MS = 60_000;

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------
const panicSchema = z.object({
  sessionId: z.string().uuid("sessionId must be a valid UUID"),
  reason: z.string().max(500).optional(),
});

interface PositionRow {
  id: string;
  symbol: string;
  quantity: number;
  current_price: number | null;
  avg_price: number;
}

// ---------------------------------------------------------------------------
// POST /api/v1/trading/panic
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Auth
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const userId = user.id;

    // 2. Rate limit
    const lastPanic = panicCooldown.get(userId);
    const now = Date.now();
    if (lastPanic && now - lastPanic < PANIC_COOLDOWN_MS) {
      const retryAfter = Math.ceil((PANIC_COOLDOWN_MS - (now - lastPanic)) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Panic rate-limited. Retry after ${retryAfter}s.`,
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    // 3. Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const parsed = panicSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 422 },
      );
    }

    const { sessionId, reason = "User triggered emergency close-all" } = parsed.data;

    // 4. Verify session belongs to user and is active live session
    const { data: session, error: sessionError } = await supabase
      .from("trading_sessions")
      .select("id, user_id, status, mode, current_capital_nok")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: "Session not found or access denied" },
        { status: 404 },
      );
    }

    if (session.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error: `Session is '${session.status}', cannot panic-close. Only active sessions can be panic-closed.`,
        },
        { status: 409 },
      );
    }

    if (session.mode !== "live") {
      return NextResponse.json(
        {
          success: false,
          error: "Panic close is only available for live sessions. Use manual sell for paper trading.",
        },
        { status: 400 },
      );
    }

    // 5. Fetch all open positions
    const { data: positions, error: positionsError } = await supabase
      .from("positions")
      .select("id, symbol, quantity, current_price, avg_price")
      .eq("user_id", userId)
      .gt("quantity", 0);

    if (positionsError) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch positions" },
        { status: 500 },
      );
    }

    if (!positions || positions.length === 0) {
      return NextResponse.json({
        success: true,
        positionsClosed: 0,
        totalValueClosed: 0,
        errors: [],
        sessionId,
        message: "No open positions to close",
      });
    }

    // 6. Mark rate limit BEFORE firing orders (prevent double-trigger)
    panicCooldown.set(userId, now);

    // 7. Sell all positions in parallel — never stop on individual failure
    const typedPositions = positions as PositionRow[];
    const results = await Promise.allSettled(
      typedPositions.map((pos) =>
        executeTrade(supabase, {
          userId,
          sessionId,
          mode: "live",
          symbol: pos.symbol,
          side: "sell",
          quantity: pos.quantity,
          price: pos.current_price ?? pos.avg_price,
          orderType: "market",
        }),
      ),
    );

    const errors: string[] = [];
    let positionsClosed = 0;
    let totalValueClosed = 0;

    results.forEach((result, i) => {
      const pos = typedPositions[i];
      if (result.status === "fulfilled" && result.value.success) {
        positionsClosed++;
        const price = pos.current_price ?? pos.avg_price;
        totalValueClosed += pos.quantity * price;
      } else {
        const msg =
          result.status === "rejected"
            ? String(result.reason)
            : (result.value.error ?? "Unknown error");
        errors.push(`${pos.symbol}: ${msg}`);
      }
    });

    // 8. Set session status to panic_closed
    await supabase
      .from("trading_sessions")
      .update({
        status: "panic_closed",
        stopped_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("user_id", userId);

    // 9. Audit log
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "PANIC_CLOSE_ALL",
      metadata: {
        sessionId,
        reason,
        positionsClosed,
        totalValueClosed,
        errors,
        totalPositions: typedPositions.length,
        timestamp: new Date().toISOString(),
      },
    });

    // 10. Response
    return NextResponse.json({
      success: errors.length === 0 || positionsClosed > 0,
      positionsClosed,
      totalValueClosed,
      errors,
      sessionId,
    });
  } catch (err) {
    console.error("[panic] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Explicitly block other methods
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
