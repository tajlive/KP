import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getPaperTradingSession } from "@/lib/supabase/paper-trading";

export const dynamic = "force-dynamic";

/**
 * GET /api/paper-trading/balance
 *
 * Returns the current paper trading balance and recent trades for the
 * authenticated user. Used by the paper trading dashboard and e2e tests.
 */
export async function GET(request: NextRequest) {
  try {
    // Timeout guard: if Supabase server client hangs (Worker + httpOnly cookies), fail fast
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const supabase = await createServerClient().catch(() => null);
    if (!supabase) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: "Service unavailable", code: "SERVER_CLIENT_FAILED" },
        { status: 503 },
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    clearTimeout(timeoutId);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const session = await getPaperTradingSession(supabase, user.id);

    if (!session) {
      return NextResponse.json(
        { error: "No paper trading session found", code: "NO_SESSION" },
        { status: 404 },
      );
    }

    const { data: recentTrades, error: tradesError } = await supabase
      .from("trades")
      .select("id, trading_pair, side, quantity, price, total_value, fee, status, created_at, strategy_signal")
      .eq("session_id", session.id)
      .eq("mode", "paper")
      .order("created_at", { ascending: false })
      .limit(50);

    if (tradesError) {
      console.error("[paper-trading/balance] trades fetch error:", tradesError);
      return NextResponse.json(
        { error: "Failed to fetch trades", code: "TRADES_FETCH_FAILED" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      balance: {
        current: session.current_capital_nok ?? 0,
        starting: session.starting_capital_nok ?? 100000,
      },
      recentTrades: (recentTrades ?? []).map((t) => ({
        id: t.id,
        symbol: t.trading_pair,
        side: t.side,
        quantity: t.quantity,
        price: t.price,
        total_value: t.total_value,
        fee: t.fee,
        status: t.status,
        created_at: t.created_at,
        is_bot: t.strategy_signal != null,
      })) as Array<{
        id: string;
        symbol: string;
        side: "buy" | "sell";
        quantity: number;
        price: number;
        total_value: number;
        fee: number;
        status: string;
        created_at: string;
        is_bot: boolean;
      }>,
    });
  } catch (err) {
    console.error("[paper-trading/balance] Unexpected error:", err);
    return NextResponse.json(
      { error: "Could not fetch paper trading balance", code: "BALANCE_FAILED" },
      { status: 500 },
    );
  }
}
