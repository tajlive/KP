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

    // Pengekontrakt v1.0 (2026-08-12): paper SSoT = paper_accounts.current_balance.
    // session.current_capital_nok er per-sesjon og kan avvike (stoppede sesjoner,
    // flersesjonskonti). Fallback til session kun hvis paper_accounts mangler rad.
    const { data: paperAccount } = await supabase
      .from("paper_accounts")
      .select("current_balance, initial_balance, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    const balanceCurrent = Number(
      paperAccount?.current_balance ?? session.current_capital_nok ?? 0,
    );
    const balanceStarting = Number(
      paperAccount?.initial_balance ?? session.starting_capital_nok ?? 100000,
    );
    const balanceUpdatedAt = paperAccount?.updated_at ?? null;

    // Hent åpen posisjon direkte fra session
    const raw = session as unknown as Record<string, unknown>;
    const openPos = (raw.open_position ?? null) as {
      side?: "long" | "short";
      quantity?: number;
      entry_price?: number;
      highest_price?: number;
    } | null;

    const positions: Array<{
      symbol: string;
      position_type: string;
      quantity: number;
      entry_price: number;
      current_price?: number;
      profit_loss?: number;
      is_bot?: boolean;
    }> = [];

    if (openPos && (openPos.quantity ?? 0) > 0) {
      // Hent nåværende pris fra coin_prices
      // Bruk fullt symbol (BTCUSDT) — ikon strip USDT, da coin_prices har USDT-suffiks.
      const lookupSymbol = session.trading_pair?.includes("USDT")
        ? session.trading_pair
        : `${session.trading_pair ?? "BTC"}USDT`;
      const { data: priceData } = await supabase
        .from("coin_prices")
        .select("symbol, price")
        .eq("symbol", lookupSymbol)
        .maybeSingle();

      const currentPrice = priceData?.price
        ? Number(priceData.price)
        : Number(openPos.entry_price ?? 0);
      const entryPrice = Number(openPos.entry_price ?? 0);
      const qty = Number(openPos.quantity ?? 0);
      const pnl =
        qty > 0 && entryPrice > 0
          ? (currentPrice - entryPrice) * qty
          : undefined;

      positions.push({
        symbol: session.trading_pair ?? "BTC",
        position_type: openPos.side === "short" ? "short" : "long",
        quantity: qty,
        entry_price: entryPrice,
        current_price: currentPrice,
        profit_loss: pnl,
        is_bot: true,
      });
    }

    const { data: recentTrades, error: tradesError } = await supabase
      .from("trades")
      .select(
        "id, trading_pair, side, quantity, price, total_value, fee, status, created_at, strategy_signal",
      )
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
        current: balanceCurrent,
        starting: balanceStarting,
        updatedAt: balanceUpdatedAt,
      },
      positions,
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
      {
        error: "Could not fetch paper trading balance",
        code: "BALANCE_FAILED",
      },
      { status: 500 },
    );
  }
}
