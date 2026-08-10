import {
  buildTradingAnalytics,
  type TradeAnalyticsInput,
} from "@/lib/trading/build-trading-analytics";
import {
  clampedRealizedPnl,
  getCleanTrades,
  type CleanTrade,
} from "@/lib/trading/clean-trades";
import { createClient, createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MAX_TRADES = 4000;

// Trades hentes via getCleanTrades() — forurensings-cutoff (2026-07-30) og
// oversell-clamp eies av clean-trades.ts (PROMPT #16), ikke av denne ruta.

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
    effectiveWinCount: z.number(),
    effectiveLossCount: z.number(),
    effectiveBreakevenCount: z.number(),
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
  riskMetrics: z.object({
    sortinoRatio: z.number(),
    calmarRatio: z.number(),
    var95: z.number(),
    var99: z.number(),
    expectedShortfall95: z.number(),
    omegaRatio: z.number(),
    maxConsecutiveLosses: z.number(),
    avgTimeToRecovery: z.number(),
    gainPainRatio: z.number(),
  }),
  // AI-forklaringer (PROMPT #14 / BRIEF §9) — nullable ved LLM-nedetid
  riskAI: z
    .object({
      summary: z.string(),
      metrics: z.record(z.string(), z.string()),
      source: z.enum(["llm", "template"]),
      generatedAt: z.string(),
    })
    .nullable(),
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

    // 2026-08-10 (QA P1): Sesjonsfilter på archived=false er FJERNET.
    // Arkivering er en visnings-/hygiene-flagg for sesjonslister — den skal
    // ikke slette brukerens resultathistorikk. Filtret ga «0 handler» på
    // Resultater-siden for brukere med arkiverte sesjoner, mens Historikk
    // (uten filter) viste alle. Forurensings-cutoff i getCleanTrades
    // håndterer datakvalitet; utelatt sessionIds = alle sesjoner.
    let cleanTrades: CleanTrade[];
    try {
      cleanTrades = await getCleanTrades(supabase, user.id, undefined, {
        limit: MAX_TRADES,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[GET /api/user/trading-analytics]", msg);
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }

    // Clamp: sell kan ikke overstige akkumulert buy per posisjon — alle
    // påfølgende tall (aggregates, kurver, risikometrikker) bygger på
    // clamped verdier, aldri rå realized_pnl fra oversell-perioden.
    const clamped = clampedRealizedPnl(cleanTrades);
    const analyticsInput: TradeAnalyticsInput[] = cleanTrades.map((t) => ({
      id: t.id,
      trading_pair: t.trading_pair,
      side: t.side,
      realized_pnl: clamped.get(t.id) ?? null,
      mode: t.mode,
      created_at: t.created_at,
      executed_at: t.executed_at,
      total_value: t.total_value,
    }));

    let built;
    try {
      built = buildTradingAnalytics(analyticsInput);
    } catch (buildErr) {
      const buildMsg =
        buildErr instanceof Error ? buildErr.message : "Unknown build error";
      console.error(
        "[GET /api/user/trading-analytics] buildTradingAnalytics failed:",
        buildMsg,
        buildErr,
      );
      return NextResponse.json(
        { ok: false, error: "Failed to compute analytics", details: buildMsg },
        { status: 500 },
      );
    }

    // ── AI-forklaringer (PROMPT #14 / BRIEF §9) ──────────────────────────
    // Én forklaring per nøkkeltall + samlet oppsummering, på brukerens språk.
    // Cachet per dag (KV hvis tilgjengelig). Fakta-regel: forklarer tallene,
    // lover aldri fremtidig avkastning. Feiler stille til null ved LLM-nedetid.
    let riskAI:
      | import("@/lib/trading/risk-ai-explanations").RiskAIExplanation
      | null = null;
    try {
      const locale = request.headers.get("accept-language")?.startsWith("en")
        ? "en"
        : "no";
      const { generateRiskExplanations } =
        await import("@/lib/trading/risk-ai-explanations");
      riskAI = await generateRiskExplanations(
        {
          ...built.riskMetrics,
          riskScore: 0, // beregnes i panel — ikke nødvendig for forklaringen
          tradeCount: built.tradeCount,
          winRatePct: built.aggregates.winRateRealizedPct,
        },
        locale,
      );
    } catch (aiErr) {
      console.warn(
        "[GET /api/user/trading-analytics] riskAI feilet:",
        (aiErr as Error).message,
      );
    }

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
      riskMetrics: built.riskMetrics,
      riskAI,
    };

    const check = responseSchema.safeParse(body);
    if (!check.success) {
      console.error(
        "[GET /api/user/trading-analytics] Response validation failed:",
        check.error.flatten(),
      );
      return NextResponse.json(
        {
          ok: false,
          error: "Response validation failed",
          details: check.error.format(),
        },
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
