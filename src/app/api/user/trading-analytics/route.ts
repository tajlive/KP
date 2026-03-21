import { buildTradingAnalytics } from "@/lib/trading/build-trading-analytics";
import { createClient, createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MAX_TRADES = 4000;

const tradeRowSchema = z.object({
  id: z.string(),
  trading_pair: z.string(),
  side: z.string(),
  realized_pnl: z.number().nullable(),
  mode: z.string().nullable(),
  created_at: z.string(),
  executed_at: z.string().nullable(),
  total_value: z.number().nullable(),
});

const responseSchema = z.object({
  ok: z.literal(true),
  generatedAt: z.string(),
  tradeCount: z.number(),
  aggregates: z.object({
    rowCount: z.number(),
    winCount: z.number(),
    lossCount: z.number(),
    breakevenCount: z.number(),
    noRealizedPnlCount: z.number(),
    totalRealizedPnl: z.number(),
    totalEffectivePnl: z.number(),
    winRateRealizedPct: z.number().nullable(),
  }),
  cumulativePnl: z.array(
    z.object({
      t: z.string(),
      label: z.string(),
      cumulative: z.number(),
    }),
  ),
  dailyPnl: z.array(z.object({ day: z.string(), pnl: z.number() })),
  modeSplit: z.array(
    z.object({ mode: z.string(), pnl: z.number(), trades: z.number() }),
  ),
  topPairs: z.array(
    z.object({ pair: z.string(), pnl: z.number(), trades: z.number() }),
  ),
  winLossSlices: z.array(
    z.object({
      key: z.enum(["win", "loss", "breakeven", "unknown"]),
      value: z.number(),
      fill: z.string(),
    }),
  ),
  bestDay: z.object({ day: z.string(), pnl: z.number() }).nullable(),
  worstDay: z.object({ day: z.string(), pnl: z.number() }).nullable(),
});

function getAuthUser(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);
  return supabase.auth.getUser();
}

export async function GET(request: NextRequest) {
  try {
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const supabase = createClient();
    const { data: rows, error } = await supabase
      .from("trades")
      .select(
        "id, trading_pair, side, realized_pnl, mode, created_at, executed_at, total_value",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(MAX_TRADES);

    if (error) {
      console.error("[GET /api/user/trading-analytics]", error.message);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const parsed = z.array(tradeRowSchema).safeParse(rows ?? []);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid trade payload" },
        { status: 500 },
      );
    }

    const built = buildTradingAnalytics(parsed.data);
    const body = {
      ok: true as const,
      generatedAt: built.generatedAt,
      tradeCount: built.tradeCount,
      aggregates: built.aggregates,
      cumulativePnl: built.cumulativePnl,
      dailyPnl: built.dailyPnl,
      modeSplit: built.modeSplit,
      topPairs: built.topPairs,
      winLossSlices: built.winLossSlices,
      bestDay: built.bestDay,
      worstDay: built.worstDay,
    };

    const check = responseSchema.safeParse(body);
    if (!check.success) {
      return NextResponse.json(
        { ok: false, error: "Response validation failed" },
        { status: 500 },
      );
    }

    return NextResponse.json(check.data, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
