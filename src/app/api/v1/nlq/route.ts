import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface NlqRequest {
  query: string;
}

interface NlqResponse {
  answer: string;
  type: "summary" | "metric" | "comparison" | "unknown";
  data?: Record<string, unknown>;
}

const MAX_TRADES = 4000;

function parseQuery(query: string): {
  intent: string;
  timeframe?: "day" | "week" | "month" | "all";
} {
  const q = query.toLowerCase().trim();

  if (q.includes("win rate") || q.includes("winrate") || q.includes("prosent vinn")) {
    return { intent: "win_rate" };
  }

  if (q.includes("hvor mange trades") || q.includes("how many trades") || q.includes("antall trades") || q.includes("trade count")) {
    return { intent: "trade_count" };
  }

  if (q.includes("hvordan gikk det") || q.includes("how did i do") || q.includes("performance") || q.includes("resultat") || q.includes("pnl") || q.includes("p&l") || q.includes("profitt") || q.includes("fortjeneste")) {
    let timeframe: "day" | "week" | "month" | "all" = "all";
    if (q.includes("forrige uke") || q.includes("last week") || q.includes("siste uke")) {
      timeframe = "week";
    } else if (q.includes("forrige måned") || q.includes("last month") || q.includes("siste måned")) {
      timeframe = "month";
    } else if (q.includes("i dag") || q.includes("today") || q.includes("siste dag")) {
      timeframe = "day";
    }
    return { intent: "pnl", timeframe };
  }

  if (q.includes("beste dag") || q.includes("best day") || q.includes("beste trade") || q.includes("best trade")) {
    return { intent: "best" };
  }
  if (q.includes("verste dag") || q.includes("worst day") || q.includes("verste trade") || q.includes("worst trade")) {
    return { intent: "worst" };
  }

  if (q.includes("hvilke pairs") || q.includes("which pairs") || q.includes("beste symbol") || q.includes("beste asset") || q.includes("tjener mest") || q.includes("make the most")) {
    return { intent: "top_pairs" };
  }

  if (q.includes("drawdown") || q.includes("risk") || q.includes("risiko") || q.includes("nedgang") || q.includes("max tap")) {
    return { intent: "risk" };
  }

  if (q.includes("balanse") || q.includes("balance") || q.includes("kapital") || q.includes("capital") || q.includes("hvor mye penger")) {
    return { intent: "balance" };
  }

  return { intent: "unknown" };
}

async function buildAnswer(
  intent: string,
  timeframe: "day" | "week" | "month" | "all" | undefined,
  userId: string,
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  locale: string = "no",
): Promise<NlqResponse> {
  const isNo = locale === "no" || locale === "nb" || locale === "nn";

  const { data: rows, error } = await supabase
    .from("trades")
    .select("id, trading_pair, side, realized_pnl, mode, created_at, executed_at, total_value")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(MAX_TRADES);

  if (error || !rows || rows.length === 0) {
    return {
      answer: isNo
        ? "Jeg har ikke noen trade-data å analysere ennå. Start din første session!"
        : "I don't have any trade data to analyze yet. Start your first session!",
      type: "unknown",
    };
  }

  const trades = rows as Array<{
    id: string;
    trading_pair: string;
    side: string;
    realized_pnl: number | null;
    mode: string | null;
    created_at: string;
    executed_at: string | null;
    total_value: number | null;
  }>;

  const totalTrades = trades.length;
  const wins = trades.filter((t) => (t.realized_pnl ?? 0) > 0).length;
  const losses = trades.filter((t) => (t.realized_pnl ?? 0) < 0).length;
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
  const totalPnl = trades.reduce((sum, t) => sum + (t.realized_pnl ?? 0), 0);

  const now = new Date();
  let filteredTrades = trades;
  if (timeframe === "day") {
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    filteredTrades = trades.filter((t) => new Date(t.created_at) >= dayAgo);
  } else if (timeframe === "week") {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filteredTrades = trades.filter((t) => new Date(t.created_at) >= weekAgo);
  } else if (timeframe === "month") {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    filteredTrades = trades.filter((t) => new Date(t.created_at) >= monthAgo);
  }

  const filteredPnl = filteredTrades.reduce((sum, t) => sum + (t.realized_pnl ?? 0), 0);
  const filteredWins = filteredTrades.filter((t) => (t.realized_pnl ?? 0) > 0).length;
  const filteredWinRate = filteredTrades.length > 0 ? Math.round((filteredWins / filteredTrades.length) * 100) : 0;

  switch (intent) {
    case "win_rate": {
      return {
        answer: isNo
          ? `Din win rate er ${winRate}% (${wins} av ${totalTrades} trades). ${winRate >= 55 ? "Dette er over bransjesnittet — sterkt!" : winRate >= 45 ? "Dette er innenfor normalen. Fokuser på risk/reward-forholdet." : "Dette er under bransjesnittet. Gjennomgå tapende trades for mønstre."}`
          : `Your win rate is ${winRate}% (${wins} of ${totalTrades} trades). ${winRate >= 55 ? "This is above industry average — strong!" : winRate >= 45 ? "This is within normal range. Focus on your risk/reward ratio." : "This is below industry average. Review losing trades for patterns."}`,
        type: "metric",
        data: { winRate, wins, losses, totalTrades },
      };
    }

    case "trade_count": {
      return {
        answer: isNo
          ? `Du har gjennomført ${totalTrades} trades totalt. ${wins > losses ? `${wins} var profitable og ${losses} var tapende.` : `${losses} var tapende og ${wins} var profitable.`}`
          : `You have completed ${totalTrades} trades total. ${wins > losses ? `${wins} were profitable and ${losses} were losing.` : `${losses} were losing and ${wins} were profitable.`}`,
        type: "metric",
        data: { totalTrades, wins, losses },
      };
    }

    case "pnl": {
      const periodText = timeframe === "day" ? (isNo ? "siste 24 timer" : "last 24 hours") : timeframe === "week" ? (isNo ? "siste uke" : "last week") : timeframe === "month" ? (isNo ? "siste måned" : "last month") : (isNo ? "totalt" : "total");
      const pnl = timeframe ? filteredPnl : totalPnl;
      const wr = timeframe ? filteredWinRate : winRate;
      const tc = timeframe ? filteredTrades.length : totalTrades;
      return {
        answer: isNo
          ? `Din P&L ${periodText} er ${pnl >= 0 ? "+" : ""}${pnl.toLocaleString()} NOK over ${tc} trades. Win rate: ${wr}%. ${pnl > 0 ? "Godt resultat!" : pnl < 0 ? "Tøff periode — vurder å justere posisjonsstørrelsen." : "Break-even."}`
          : `Your P&L ${periodText} is ${pnl >= 0 ? "+" : ""}${pnl.toLocaleString()} NOK across ${tc} trades. Win rate: ${wr}%. ${pnl > 0 ? "Good result!" : pnl < 0 ? "Tough stretch — consider adjusting position size." : "Break-even."}`,
        type: "summary",
        data: { pnl, winRate: wr, tradeCount: tc, timeframe },
      };
    }

    case "best": {
      const best = trades.reduce((best, t) => ((t.realized_pnl ?? 0) > (best.realized_pnl ?? 0) ? t : best));
      const dailyPnl = trades.reduce((acc, t) => {
        const day = t.created_at.slice(0, 10);
        acc[day] = (acc[day] ?? 0) + (t.realized_pnl ?? 0);
        return acc;
      }, {} as Record<string, number>);
      const bestDay = Object.entries(dailyPnl).reduce((best, [day, pnl]) => (pnl > best.pnl ? { day, pnl } : best), { day: "", pnl: -Infinity });
      return {
        answer: isNo
          ? `Din beste trade var ${best.trading_pair} med +${(best.realized_pnl ?? 0).toLocaleString()} NOK. Din beste dag var ${bestDay.day} med +${bestDay.pnl.toLocaleString()} NOK.`
          : `Your best trade was ${best.trading_pair} at +${(best.realized_pnl ?? 0).toLocaleString()} NOK. Your best day was ${bestDay.day} at +${bestDay.pnl.toLocaleString()} NOK.`,
        type: "metric",
        data: { bestTrade: best, bestDay },
      };
    }

    case "worst": {
      const worst = trades.reduce((worst, t) => ((t.realized_pnl ?? 0) < (worst.realized_pnl ?? 0) ? t : worst));
      const dailyPnl = trades.reduce((acc, t) => {
        const day = t.created_at.slice(0, 10);
        acc[day] = (acc[day] ?? 0) + (t.realized_pnl ?? 0);
        return acc;
      }, {} as Record<string, number>);
      const worstDay = Object.entries(dailyPnl).reduce((worst, [day, pnl]) => (pnl < worst.pnl ? { day, pnl } : worst), { day: "", pnl: Infinity });
      return {
        answer: isNo
          ? `Din verste trade var ${worst.trading_pair} med ${(worst.realized_pnl ?? 0).toLocaleString()} NOK. Din verste dag var ${worstDay.day} med ${worstDay.pnl.toLocaleString()} NOK.`
          : `Your worst trade was ${worst.trading_pair} at ${(worst.realized_pnl ?? 0).toLocaleString()} NOK. Your worst day was ${worstDay.day} at ${worstDay.pnl.toLocaleString()} NOK.`,
        type: "metric",
        data: { worstTrade: worst, worstDay },
      };
    }

    case "top_pairs": {
      const pairStats = trades.reduce((acc, t) => {
        const pair = t.trading_pair;
        if (!acc[pair]) acc[pair] = { pnl: 0, trades: 0 };
        acc[pair].pnl += t.realized_pnl ?? 0;
        acc[pair].trades += 1;
        return acc;
      }, {} as Record<string, { pnl: number; trades: number }>);
      const top = Object.entries(pairStats).sort((a, b) => b[1].pnl - a[1].pnl).slice(0, 3);
      const pairText = top.map(([pair, stat], i) => `${i + 1}. ${pair}: ${stat.pnl >= 0 ? "+" : ""}${stat.pnl.toLocaleString()} NOK (${stat.trades} trades)`).join("\n");
      return {
        answer: isNo ? `Dine topp 3 pairs:\n${pairText}` : `Your top 3 pairs:\n${pairText}`,
        type: "comparison",
        data: { topPairs: top },
      };
    }

    case "risk": {
      let peak = 0;
      let maxDD = 0;
      let running = 0;
      for (const t of [...trades].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
        running += t.realized_pnl ?? 0;
        if (running > peak) peak = running;
        const dd = peak - running;
        if (dd > maxDD) maxDD = dd;
      }
      const avgWin = wins > 0 ? trades.filter((t) => (t.realized_pnl ?? 0) > 0).reduce((sum, t) => sum + (t.realized_pnl ?? 0), 0) / wins : 0;
      const avgLoss = losses > 0 ? trades.filter((t) => (t.realized_pnl ?? 0) < 0).reduce((sum, t) => sum + Math.abs(t.realized_pnl ?? 0), 0) / losses : 0;
      const rr = avgLoss > 0 ? avgWin / avgLoss : 0;
      return {
        answer: isNo
          ? `Risk-oversikt:\n• Max drawdown: ${maxDD.toLocaleString()} NOK\n• Risk/reward ratio: ${rr.toFixed(2)}\n• Tap i streak: ${losses > 3 ? "3+ — vurder pause" : losses + " — innenfor grenser"}`
          : `Risk overview:\n• Max drawdown: ${maxDD.toLocaleString()} NOK\n• Risk/reward ratio: ${rr.toFixed(2)}\n• Loss streak: ${losses > 3 ? "3+ — consider a break" : losses + " — within limits"}`,
        type: "metric",
        data: { maxDrawdown: maxDD, riskReward: rr, lossStreak: losses },
      };
    }

    case "balance": {
      const { data: session } = await supabase
        .from("trading_sessions")
        .select("current_capital_nok, starting_capital_nok")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const current = session?.current_capital_nok ?? 0;
      const starting = session?.starting_capital_nok ?? 100000;
      const change = ((current - starting) / starting) * 100;
      return {
        answer: isNo
          ? `Din kontobalanse er ${current.toLocaleString()} NOK (startet med ${starting.toLocaleString()} NOK). Endring: ${change >= 0 ? "+" : ""}${change.toFixed(1)}%.`
          : `Your account balance is ${current.toLocaleString()} NOK (started with ${starting.toLocaleString()} NOK). Change: ${change >= 0 ? "+" : ""}${change.toFixed(1)}%.`,
        type: "metric",
        data: { current, starting, changePct: change },
      };
    }

    default: {
      return {
        answer: isNo
          ? "Jeg kan hjelpe deg med:\n• \"Hvordan gikk det forrige uke?\"\n• \"Hva er min win rate?\"\n• \"Hvilke pairs tjener jeg mest på?\"\n• \"Hva er min max drawdown?\"\n• \"Hvor mange trades har jeg gjort?\""
          : "I can help you with:\n• \"How did I do last week?\"\n• \"What's my win rate?\"\n• \"Which pairs make me the most?\"\n• \"What's my max drawdown?\"\n• \"How many trades have I made?\"",
        type: "unknown",
      };
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseClient = await createServerClient();
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as NlqRequest;
    const { query } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const locale = request.headers.get("accept-language")?.split(",")[0]?.split("-")[0] ?? "no";
    const { intent, timeframe } = parseQuery(query);
    const response = await buildAnswer(intent, timeframe, user.id, supabaseClient, locale);

    return NextResponse.json(response, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
