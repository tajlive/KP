import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyLiveEntitlement } from "@/lib/auth/live-trading";
import { z } from "zod";
import type { TradingAnalytics } from "@/features/trading-cockpit/types";

const paramsSchema = z.object({
  mode: z.enum(["paper", "live"]),
  dateRange: z.enum(["7d", "30d", "90d", "1y", "all"]).default("30d"),
  pair: z.string().optional(),
  status: z
    .enum([
      "all",
      "filled",
      "partially_filled",
      "pending",
      "cancelled",
      "failed",
    ])
    .optional(),
  sessionStatus: z
    .enum(["all", "active", "paused", "stopped", "crashed"])
    .optional(),
  side: z.enum(["all", "buy", "sell"]).optional(),
  search: z.string().optional(),
});

function dateRangeToRange(
  dateRange: string,
): { from: string | null; to: string | null } {
  if (dateRange === "all") return { from: null, to: null };

  const now = new Date();
  const map: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "1y": 365,
  };
  const days = map[dateRange] ?? 30;
  const from = new Date(
    now.getTime() - days * 24 * 60 * 60 * 1000,
  ).toISOString();
  return { from, to: now.toISOString() };
}

function coerceNumber(value: unknown): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  return 0;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function parseTradesByDay(value: unknown): TradingAnalytics["trades_by_day"] {
  if (!Array.isArray(value)) return [];
  return value
    .map(toRecord)
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      date: typeof item.date === "string" ? item.date : "",
      pnl: coerceNumber(item.pnl),
      trades: coerceNumber(item.trades),
    }));
}

function parseTradesBySymbol(
  value: unknown,
): TradingAnalytics["trades_by_symbol"] {
  if (!Array.isArray(value)) return [];
  return value
    .map(toRecord)
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      symbol: typeof item.symbol === "string" ? item.symbol : "",
      pnl: coerceNumber(item.pnl),
      trades: coerceNumber(item.trades),
    }));
}

function toAnalyticsRow(raw: Record<string, unknown>): TradingAnalytics {
  return {
    total_trades: coerceNumber(raw.total_trades),
    winning_trades: coerceNumber(raw.winning_trades),
    losing_trades: coerceNumber(raw.losing_trades),
    // RPC returnerer prosent (0-100). Frontend håndterer visning.
    win_rate: nullableNumber(raw.win_rate),
    total_pnl: coerceNumber(raw.total_pnl),
    total_fees: coerceNumber(raw.total_fees),
    starting_capital: coerceNumber(raw.starting_capital),
    max_drawdown_pct: nullableNumber(raw.max_drawdown_pct),
    profit_factor: nullableNumber(raw.profit_factor),
    best_pair: nullableString(raw.best_pair),
    best_pair_pnl: nullableNumber(raw.best_pair_pnl),
    worst_pair: nullableString(raw.worst_pair),
    worst_pair_pnl: nullableNumber(raw.worst_pair_pnl),
    best_session_id: nullableString(raw.best_session_id),
    best_session_pnl: nullableNumber(raw.best_session_pnl),
    worst_session_id: nullableString(raw.worst_session_id),
    worst_session_pnl: nullableNumber(raw.worst_session_pnl),
    trades_by_day: parseTradesByDay(raw.trades_by_day),
    trades_by_symbol: parseTradesBySymbol(raw.trades_by_symbol),
  };
}

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
  const parsed = paramsSchema.safeParse({
    mode: searchParams.get("mode"),
    dateRange: searchParams.get("dateRange") || "30d",
    pair: searchParams.get("pair") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    sessionStatus: searchParams.get("sessionStatus") ?? undefined,
    side: searchParams.get("side") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid params", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { mode, dateRange, pair, status, sessionStatus, side, search } =
    parsed.data;
  const { from, to } = dateRangeToRange(dateRange);

  if (mode === "live" && !(await verifyLiveEntitlement(supabase, user.id))) {
    return NextResponse.json(
      { error: "Live trading not available" },
      { status: 403 },
    );
  }

  const tradeStatuses =
    status && status !== "all" ? [status] : [];
  const sessionStatuses =
    sessionStatus && sessionStatus !== "all" ? [sessionStatus] : [];

  const { data: rows, error } = await supabase.rpc("get_trading_analytics", {
    p_user_id: user.id,
    p_mode: mode,
    // Genererte typer krever non-null args — SQL-funksjonen håndterer tomme verdier som "alle"
    p_trade_statuses: tradeStatuses as string[],
    p_session_statuses: sessionStatuses as string[],
    p_side: side && side !== "all" ? side : "",
    p_pair: pair || "",
    p_search: search || "",
    p_from: from ?? "",
    p_to: to ?? "",
  });

  if (error) {
    console.error("[trading-cockpit/analytics]", error);
    return NextResponse.json(
      { error: "Could not fetch analytics" },
      { status: 500 },
    );
  }

  const raw = rows?.[0] ?? null;
  if (!raw) {
    return NextResponse.json(
      { error: "No analytics data" },
      { status: 404 },
    );
  }

  const analytics = toAnalyticsRow(raw as Record<string, unknown>);

  return NextResponse.json(
    { analytics },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
