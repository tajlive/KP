/**
 * JokerTrade API
 *
 * GET: Hent JokerTrade status + siste AI-innsikt + åpne posisjoner + trade history
 * POST: Utløs Joker-analyse — Hermes AI analyserer markedet, lagrer i market_intelligence
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createServerClient,
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthUser(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { user: null };
  }
  return { user: data.user };
}

// ---------------------------------------------------------------------------
// GET — Hent JokerTrade dashboard-data
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Uautorisert", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = createClient();

    // 1. Hent siste AI-innsikt fra market_intelligence
    const { data: latestInsight } = await db
      .from("market_intelligence")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Hent trading mode
    const { data: profile } = await db
      .from("user_profiles")
      .select("preferred_trading_mode")
      .eq("id", user.id)
      .single();

    // 3. Hent åpne posisjoner fra paper_trades (posisjoner som ikke er lukket)
    const { data: openPositions } = await db
      .from("paper_trades")
      .select(
        "id, symbol, position_type, quantity, entry_price, profit_loss, profit_loss_percent, entry_time",
      )
      .eq("account_id", user.id)
      .is("exit_time", null)
      .order("entry_time", { ascending: false })
      .limit(3);

    // 4. Hent trade history fra trades
    const { data: tradeHistory } = await db
      .from("trades")
      .select(
        "id, trading_pair, side, quantity, price, total_value, realized_pnl, executed_at, created_at, joker_trade, joker_explanation",
      )
      .eq("user_id", user.id)
      .eq("status", "filled")
      .order("executed_at", { ascending: false })
      .limit(20);

    const positions = (openPositions || []).map((p: unknown) => ({
      id: p.id,
      symbol: p.symbol,
      side: p.position_type === "long" ? "buy" : "sell",
      quantity: p.quantity,
      price: p.entry_price,
      pnl: p.profit_loss,
      created_at: p.entry_time,
    }));

    const history = (tradeHistory || []).map((t: unknown) => ({
      id: t.id,
      symbol: t.trading_pair,
      side: t.side,
      quantity: t.quantity,
      price: t.price,
      pnl: t.realized_pnl,
      executed_at: t.executed_at,
      created_at: t.created_at,
      joker_trade: t.joker_trade,
      joker_explanation: t.joker_explanation,
    }));

    return NextResponse.json({
      success: true,
      status: "active",
      insight: latestInsight || null,
      mode: profile?.preferred_trading_mode ?? "paper",
      positions,
      history,
    });
  } catch (error) {
    console.error("[jokertrade] GET error:", error);
    return NextResponse.json(
      { error: "Intern serverfeil" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Utløs Joker-analyse
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Uautorisert", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = createClient();

    // Simuler AI-analyse (i produksjon kaller dette Hermes AI-agent)
    const coins = ["BTC", "ETH", "SOL"];
    const actions = ["LONG", "SHORT", "HOLD", "WAIT"];
    const sentiments = ["bullish", "bearish", "neutral"];

    const selectedCoin = coins[Math.floor(Math.random() * coins.length)];
    const selectedAction = actions[Math.floor(Math.random() * actions.length)];
    const selectedSentiment =
      sentiments[Math.floor(Math.random() * sentiments.length)];
    const confidence = Math.floor(Math.random() * 41) + 55;
    const sentimentScore = Number(
      (
        selectedSentiment === "bullish"
          ? (Math.random() * 0.5 + 0.3)
          : selectedSentiment === "bearish"
            ? -(Math.random() * 0.5 + 0.3)
            : (Math.random() - 0.5) * 0.3
      ).toFixed(2),
    );

    const analysisContent = `## 🎭 Joker-analyse\n\n**Coin:** ${selectedCoin}\n**Signal:** ${selectedAction}\n**Sentiment:** ${selectedSentiment} (${sentimentScore})\n**Confidence:** ${confidence}%\n\n### Markedskontekst\n${selectedCoin} viser ${selectedSentiment === "bullish" ? "sterk kjøpsinteresse" : selectedSentiment === "bearish" ? "svakhet i markedet" : "nøytral prisutvikling"} med økt volum.\n\n### Anbefaling\n${selectedAction === "LONG" ? `🔵 LONG ${selectedCoin} — Bullish momentum bekreftet` : selectedAction === "SHORT" ? `🔴 SHORT ${selectedCoin} — Bearish vending forventet` : selectedAction === "HOLD" ? `🟡 HOLD ${selectedCoin} — Avvent bedre inngang` : `⚪ WAIT — Ingen klart signal akkurat nå`}\n\n*Generert av 🎭 JokerTrade AI — ${new Date().toLocaleString("no-NO")}*`;

    const { data: inserted } = await db
      .from("market_intelligence")
      .insert({
        source: "joker-ai",
        title: `🎭 Joker-signal: ${selectedAction} ${selectedCoin} (${confidence}%)`,
        content: analysisContent,
        sentiment: selectedSentiment,
        sentiment_score: sentimentScore,
        coins: [selectedCoin],
        action: selectedAction,
        confidence,
      })
      .select()
      .single();

    if (!inserted) {
      return NextResponse.json(
        { error: "Kunne ikke lagre Joker-analyse" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "🎭 Joker-analyse fullført!",
      signal: inserted,
    });
  } catch (error) {
    console.error("[jokertrade] POST error:", error);
    return NextResponse.json(
      { error: "Intern serverfeil" },
      { status: 500 },
    );
  }
}
