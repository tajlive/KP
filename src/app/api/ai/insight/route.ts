/**
 * POST /api/ai/insight
 *
 * AI-assistert innsikt basert på brukerens trade-historikk.
 * Enterprise 2026 — prediktiv risk + performance-oppsummering.
 *
 * Body:    { type: "risk_assessment" | "performance_summary" | "strategy_tip" }
 * Response: { insight: string, confidence: "high"|"medium"|"low", metrics: {...}, cached: boolean }
 *
 * Guards:
 * - Auth: Kun autentiserte brukere
 * - Rate limit: 10 req/min per bruker (Redis/memory)
 * - Cache: Per bruker per type per dag (ai_cache-tabell)
 * - AI fallback: Regel-basert innsikt hvis AI-provider ikke er konfigurert
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/middleware/rate-limit";
import { chatWithAI } from "@/lib/ai/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Types ─────────────────────────────────────────────────────────

export type InsightType = "risk_assessment" | "performance_summary" | "strategy_tip";

interface Trade {
  id: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  realized_pnl?: number;
  executed_at: string;
  symbol?: string;
  trading_pair?: string;
  mode?: string;
}

interface TradeMetrics {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgTradePnl: number;
  maxDrawdownPct: number;
  currentStreak: number;
  volatilityEstimate: number;
  bestDayPnl: number;
  worstDayPnl: number;
}

interface InsightResponse {
  insight: string;
  confidence: "high" | "medium" | "low";
  metrics: TradeMetrics;
  cached: boolean;
  generatedAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function computeMetrics(trades: Trade[]): TradeMetrics {
  const closedTrades = trades.filter((t) => t.realized_pnl !== undefined && t.realized_pnl !== null);
  
  if (closedTrades.length === 0) {
    return {
      totalTrades: trades.length, // Still show total activity
      winRate: 0,
      totalPnl: 0,
      avgTradePnl: 0,
      maxDrawdownPct: 0,
      currentStreak: 0,
      volatilityEstimate: 0,
      bestDayPnl: 0,
      worstDayPnl: 0,
    };
  }

  const dailyPnl: Record<string, number> = {};
  let totalPnl = 0;
  let wins = 0;

  for (const t of closedTrades) {
    const pnl = t.realized_pnl ?? 0;
    totalPnl += pnl;
    if (pnl > 0) wins++;

    const day = t.executed_at.slice(0, 10);
    dailyPnl[day] = (dailyPnl[day] ?? 0) + pnl;
  }

  const winRate = Math.round((wins / closedTrades.length) * 100);
  const avgTradePnl = totalPnl / closedTrades.length;

  let currentStreak = 0;
  for (let i = closedTrades.length - 1; i >= 0; i--) {
    const pnl = closedTrades[i].realized_pnl ?? 0;
    if (pnl > 0) {
      if (currentStreak >= 0) currentStreak++;
      else break;
    } else if (pnl < 0) {
      if (currentStreak <= 0) currentStreak--;
      else break;
    } else {
      break;
    }
  }

  let peak = 0;
  let cumulative = 0;
  let maxDrawdown = 0;
  for (const t of closedTrades) {
    cumulative += t.realized_pnl ?? 0;
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }
  const maxDrawdownPct = peak > 0 ? Math.round((maxDrawdown / peak) * 100) : 0;

  const dailyValues = Object.values(dailyPnl);
  let volatilityEstimate = 0;
  
  if (dailyValues.length > 1) {
    const mean = dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length;
    const variance = dailyValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / dailyValues.length;
    volatilityEstimate = Math.sqrt(variance);
  }

  const sortedDays = [...dailyValues].sort((a, b) => a - b);
  const bestDayPnl = sortedDays[sortedDays.length - 1] ?? 0;
  const worstDayPnl = sortedDays[0] ?? 0;

  return {
    totalTrades: trades.length,
    winRate,
    totalPnl: Math.round(totalPnl),
    avgTradePnl: Math.round(avgTradePnl * 100) / 100,
    maxDrawdownPct,
    currentStreak,
    volatilityEstimate: Math.round(volatilityEstimate * 100) / 100,
    bestDayPnl: Math.round(bestDayPnl),
    worstDayPnl: Math.round(worstDayPnl),
  };
}

function buildSystemPrompt(type: InsightType): string {
  const base = `Du er "Professor Kimi" — AI-mentor for Klarpakke-brukere. Analyser trade-data og gi KORT, konkret innsikt på norsk (maks 3 setninger).

VIKTIG:
- Aldri gi kjøps-/salgsanbefalinger.
- Inkluder alltid risikoadvarsel ved trading-innsikt.
- Vær pedagogisk og oppmuntrende.
- Bruk tall fra metrikkene i svaret.`;

  switch (type) {
    case "risk_assessment":
      return `${base}

OPPGAVE: Vurder risiko basert på brukerens trade-historikk.
Fokuser på: drawdown, volatilitet, tap på rad (streak), worst day.
Gi ett konkret råd om risk management.

Svarformat: Én kort paragraph. Maks 3 setninger.`;

    case "performance_summary":
      return `${base}

OPPGAVE: Oppsummer ytelsen siste 30 dager.
Fokuser på: win rate, total P&L, beste/verste dag, trend.
Sammenligne med bransjesnitt (ca. 55% win rate) hvis relevant.

Svarformat: Én kort paragraph. Maks 3 setninger.`;

    case "strategy_tip":
      return `${base}

OPPGAVE: Gi ÉN strategi-tips basert på brukerens mønster.
Fokuser på: Hva dataene tyder på (f.eks. "Du tjener mest på DCA-strategien din", "Vurder å redusere posisjonsstørrelsen etter tap").

Svarformat: Én kort paragraph. Maks 3 setninger.`;

    default:
      return base;
  }
}

function buildUserPrompt(type: InsightType, metrics: TradeMetrics, trades: Trade[]): string {
  const recentSymbols = [...new Set(trades.slice(-10).map((t) => t.symbol || t.trading_pair || "Ukjent"))].join(", ");

  return `Type innsikt: ${type}

METRIKKER (siste 30 dager):
- Antall handler: ${metrics.totalTrades}
- Win rate: ${metrics.winRate}%
- Total P&L: ${metrics.totalPnl.toLocaleString()} kr
- Gjennomsnitt per trade: ${metrics.avgTradePnl.toLocaleString()} kr
- Max drawdown: ${metrics.maxDrawdownPct}%
- Volatilitet (stddev): ${metrics.volatilityEstimate.toLocaleString()} kr/dag
- Nåværende streak: ${metrics.currentStreak > 0 ? `${metrics.currentStreak} seire på rad` : metrics.currentStreak < 0 ? `${Math.abs(metrics.currentStreak)} tap på rad` : "Ingen aktiv streak"}
- Beste dag: +${metrics.bestDayPnl.toLocaleString()} kr
- Verste dag: ${metrics.worstDayPnl.toLocaleString()} kr
- Siste symboler: ${recentSymbols}

Gi innsikten nå.`;
}

function ruleBasedInsight(
  type: InsightType,
  metrics: TradeMetrics
): { insight: string; confidence: "high" | "medium" | "low" } {
  switch (type) {
    case "risk_assessment": {
      if (metrics.maxDrawdownPct > 20) {
        return {
          insight: `Advarsel: Din max drawdown er ${metrics.maxDrawdownPct}%, som er høyt. Vurder å redusere posisjonsstørrelsen og sette strammere stop-loss. Husk at trading alltid medfører risiko for tap.`,
          confidence: "high",
        };
      }
      if (metrics.currentStreak < -3) {
        return {
          insight: `Du har ${Math.abs(metrics.currentStreak)} tap på rad. Dette kan være et tegn på at markedet har endret seg, eller at strategien trenger justering. Ta en pause og evaluer før neste trade.`,
          confidence: "medium",
        };
      }
      return {
        insight: `Din risk-profil ser balansert ut med ${metrics.maxDrawdownPct}% max drawdown. Fortsett å overvåke volatiliteten (${metrics.volatilityEstimate.toLocaleString()} kr/dag) og juster posisjonsstørrelse ved endringer.`,
        confidence: "medium",
      };
    }

    case "performance_summary": {
      const vsBenchmark = metrics.winRate >= 55 ? "over" : "under";
      return {
        insight: `Siste 30 dager: ${metrics.totalTrades} handler med ${metrics.winRate}% win rate (${vsBenchmark} bransjesnittet på ~55%). Total P&L: ${metrics.totalPnl > 0 ? "+" : ""}${metrics.totalPnl.toLocaleString()} kr. Beste dag: +${metrics.bestDayPnl.toLocaleString()} kr.`,
        confidence: metrics.totalTrades >= 10 ? "high" : "low",
      };
    }

    case "strategy_tip": {
      if (metrics.winRate < 40 && metrics.totalTrades >= 10) {
        return {
          insight: `Din win rate på ${metrics.winRate}% tyder på at strategien kan forbedres. Vurder å teste DCA (Dollar-Cost Averaging) i paper-modus først — det er den tryggeste måten å bygge posisjoner på.`,
          confidence: "medium",
        };
      }
      if (metrics.avgTradePnl < 0) {
        return {
          insight: `Gjennomsnittlig tap per trade (${metrics.avgTradePnl.toLocaleString()} kr) tyder på at stop-loss-nivåene kan være for vide. Prøv å redusere risk per trade til maks 1-2% av kapitalen.`,
          confidence: "medium",
        };
      }
      return {
        insight: `Godt jobbet! Med ${metrics.winRate}% win rate og positiv P&L er du på rett spor. Vurder å dokumentere hva som fungerer — det bygger disiplin og forbedrer langsiktig ytelse.`,
        confidence: "medium",
      };
    }

    default: {
      return {
        insight: "Ingen innsikt tilgjengelig for øyeblikket.",
        confidence: "low",
      };
    }
  }
}

// ─── Route Handler ─────────────────────────────────────────────────

export async function POST(
  request: NextRequest
): Promise<NextResponse<InsightResponse | { error: string }>> {
  const startTime = Date.now();

  try {
    // ─── 1. Auth ───────────────────────────────────────────────────
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // ─── 2. Rate Limit (per user) ─────────────────────────────────
    const rlResult = await checkRateLimit(`ai:user:${userId}`, {
      max: 10,
      window: 60,
      keyPrefix: "rl:ai",
    });
    if (!rlResult.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 10 AI insights per minute." },
        { status: 429 }
      );
    }

    // ─── 3. Parse body ────────────────────────────────────────────
    let body: { type?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const type = (body.type as InsightType) ?? "performance_summary";
    if (!["risk_assessment", "performance_summary", "strategy_tip"].includes(type)) {
      return NextResponse.json({ error: "Invalid insight type" }, { status: 400 });
    }

    // ─── 4. Check cache ───────────────────────────────────────────
    const today = getTodayKey();
    const cacheKey = `insight:${userId}:${type}:${today}`;

    const { data: cached } = await supabase
      .from("ai_cache")
      .select("value")
      .eq("cache_key", cacheKey)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached?.value && typeof cached.value === "object") {
      const cachedValue = cached.value as Record<string, unknown>;
      if ("insight" in cachedValue) {
        return NextResponse.json({
          ...(cachedValue as unknown as InsightResponse),
          cached: true,
        });
      }
    }

    // ─── 5. Fetch trades (last 30 days) ───────────────────────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: trades, error: tradesError } = await supabase
      .from("trades")
      .select("id, side, price, quantity, realized_pnl, executed_at, symbol, trading_pair, mode")
      .eq("user_id", userId)
      .gte("executed_at", thirtyDaysAgo)
      .order("executed_at", { ascending: true });

    if (tradesError) {
      console.error("[AI Insight] Trade fetch error:", tradesError);
      return NextResponse.json({ error: "Failed to fetch trade data" }, { status: 500 });
    }

    const tradeList: Trade[] = (trades ?? []).map((t) => ({
      ...t,
      realized_pnl: t.realized_pnl ?? undefined,
      symbol: t.symbol ?? undefined,
      mode: t.mode ?? undefined,
    })) as Trade[];
    const metrics = computeMetrics(tradeList);

    // ─── 6. Generate insight ──────────────────────────────────────
    let insight: string;
    let confidence: "high" | "medium" | "low";
    let aiGenerated = false;

    try {
      const aiResponse = await chatWithAI({
        systemPrompt: buildSystemPrompt(type),
        messages: [
          { role: "user", content: buildUserPrompt(type, metrics, tradeList) },
        ],
        temperature: 0.6,
        maxTokens: 300,
      });

      insight = aiResponse.content.trim();
      confidence = metrics.totalTrades >= 15 ? "high" : metrics.totalTrades >= 5 ? "medium" : "low";
      aiGenerated = true;
    } catch (aiErr) {
      console.warn("[AI Insight] AI generation failed, using rule-based fallback:", aiErr);
      const fallback = ruleBasedInsight(type, metrics);
      insight = fallback.insight;
      confidence = fallback.confidence;
    }

    // ─── 7. Build response ────────────────────────────────────────
    const response: InsightResponse = {
      insight,
      confidence,
      metrics,
      cached: false,
      generatedAt: new Date().toISOString(),
    };

    // ─── 8. Cache result ──────────────────────────────────────────
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("ai_cache").upsert(
      {
        cache_key: cacheKey,
        value: response as unknown as import("@/types/database.types").Json,
        expires_at: expiresAt,
      },
      { onConflict: "cache_key" }
    );

    // ─── 9. Return ────────────────────────────────────────────────
    const res = NextResponse.json(response);
    res.headers.set("X-RateLimit-Remaining", String(rlResult.remaining));
    res.headers.set("X-AI-Generated", String(aiGenerated));
    res.headers.set("X-Response-Time", `${Date.now() - startTime}ms`);
    return res;
  } catch (err) {
    console.error("[AI Insight] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
